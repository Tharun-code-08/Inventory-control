#!/usr/bin/env bash
# Hourly company-scoped SQL exports from a Dockerized Postgres.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib-docker.sh"

require_cmd docker
ensure_dirs

STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"

SHOP_SUBQUERY() { # $1 = company_id
  echo "select id from shops where company_id = '$1'"
}

run_dump() { # $1 table, $2 where clause, $3 tmp file path in container
  local table="$1"
  local where_clause="$2"
  local tmp_file="$3"
  docker_exec_env env DUMP_TABLE="$table" WHERE_CLAUSE="$where_clause" TMP_FILE="$tmp_file" PGDATABASE="$PGDATABASE" PGHOST="$PGHOST" PGPORT="$PGPORT" PGUSER="$PGUSER" \
    bash -c 'pg_dump --data-only --inserts --column-inserts --no-owner --no-privileges --format=p \
      --table="$DUMP_TABLE" --file=- --where "$WHERE_CLAUSE" "$PGDATABASE" >> "$TMP_FILE"'
}

companies_raw="$(docker_psql -At -c "select id || '|' || coalesce(nullif(company_code, ''), substring(id::text, 1, 8)) from companies order by 1")"

if [[ -z "${companies_raw// }" ]]; then
  log "No companies found; skipping company backups"
  exit 0
fi

while IFS='|' read -r company_id company_code; do
  [[ -z "$company_id" ]] && continue
  code_safe="${company_code:-$(echo "$company_id" | cut -c1-8)}"
  dest_dir="${COMPANY_DIR}/${code_safe}"
  mkdir -p "$dest_dir"

  TMP_IN_CONTAINER="/tmp/company-${code_safe}-${STAMP}.sql"
  TARGET="${dest_dir}/company-${STAMP}.dump"

  log "Starting company backup for ${code_safe} -> ${TARGET}"
  docker_exec sh -c "echo '-- company ${code_safe} ${company_id}' > '${TMP_IN_CONTAINER}'"

  SHOP_SUB="$(SHOP_SUBQUERY "$company_id")"

  run_dump "companies" "id = '${company_id}'" "${TMP_IN_CONTAINER}"
  run_dump "shops" "company_id = '${company_id}'" "${TMP_IN_CONTAINER}"
  run_dump "storage_locations" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"
  run_dump "suppliers" "company_id = '${company_id}'" "${TMP_IN_CONTAINER}"
  run_dump "customers" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"
  run_dump "product_plants" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"
  run_dump "products" "id in (select product_id from product_plants where shop_id in (${SHOP_SUB}))" "${TMP_IN_CONTAINER}"
  run_dump "product_specifications" "product_id in (select product_id from product_plants where shop_id in (${SHOP_SUB}))" "${TMP_IN_CONTAINER}"
  run_dump "stock_summary" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"
  run_dump "stock_ledger" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"
  run_dump "purchase_order_header" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"
  run_dump "purchase_order_items" "po_header_id in (select id from purchase_order_header where shop_id in (${SHOP_SUB}))" "${TMP_IN_CONTAINER}"
  run_dump "goods_receipt_header" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"
  run_dump "goods_receipt_items" "gr_header_id in (select id from goods_receipt_header where shop_id in (${SHOP_SUB}))" "${TMP_IN_CONTAINER}"
  run_dump "goods_issue_header" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"
  run_dump "goods_issue_items" "gi_header_id in (select id from goods_issue_header where shop_id in (${SHOP_SUB}))" "${TMP_IN_CONTAINER}"
  run_dump "sales_order_header" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"
  run_dump "sales_order_items" "so_header_id in (select id from sales_order_header where shop_id in (${SHOP_SUB}))" "${TMP_IN_CONTAINER}"
  run_dump "invoice_header" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"
  run_dump "payment_receipts" "shop_id in (${SHOP_SUB})" "${TMP_IN_CONTAINER}"

  docker_cp_from_container "${TMP_IN_CONTAINER}" "${TARGET}"
  checksum_file "${TARGET}"
  ln -sfn "${TARGET}" "${dest_dir}/latest.dump"

  log "Company backup completed for ${code_safe}"
done <<<"$companies_raw"
