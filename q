[0;1;32m●[0m nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (]8;;file://srv1699959/usr/lib/systemd/system/nginx.service/usr/lib/systemd/system/nginx.service]8;;; [0;1;32menabled[0m; preset: [0;1;32menabled[0m)
     Active: [0;1;32mactive (running)[0m since Wed 2026-06-17 04:56:25 UTC; 21ms ago
       Docs: ]8;;man:nginx(8)man:nginx(8)]8;;
    Process: 581715 ExecStartPre=/usr/sbin/nginx -t -q -g daemon on; master_process on; (code=exited, status=0/SUCCESS)
    Process: 581716 ExecStart=/usr/sbin/nginx -g daemon on; master_process on; (code=exited, status=0/SUCCESS)
   Main PID: 581718 (nginx)
      Tasks: 2 (limit: 4652)
     Memory: 2.2M (peak: 2.9M)
        CPU: 21ms
     CGroup: /system.slice/nginx.service
             ├─[0;38;5;245m581718 "nginx: master process /usr/sbin/nginx -g daemon on; master_process on;"[0m
             └─[0;38;5;245m581719 "nginx: worker process"[0m

Jun 17 04:56:25 srv1699959 systemd[1]: Starting nginx.service - A high performance web server and a reverse proxy server...
Jun 17 04:56:25 srv1699959 nginx[581715]: 2026/06/17 04:56:25 [warn] 581715#581715: conflicting server name "softdigitconsulting.com" on 0.0.0.0:80, ignored
Jun 17 04:56:25 srv1699959 nginx[581715]: 2026/06/17 04:56:25 [warn] 581715#581715: conflicting server name "www.softdigitconsulting.com" on 0.0.0.0:80, ignored
Jun 17 04:56:25 srv1699959 nginx[581715]: 2026/06/17 04:56:25 [warn] 581715#581715: conflicting server name "softdigitconsulting.com" on 0.0.0.0:443, ignored
Jun 17 04:56:25 srv1699959 nginx[581715]: 2026/06/17 04:56:25 [warn] 581715#581715: conflicting server name "www.softdigitconsulting.com" on 0.0.0.0:443, ignored
Jun 17 04:56:25 srv1699959 nginx[581716]: 2026/06/17 04:56:25 [warn] 581716#581716: conflicting server name "softdigitconsulting.com" on 0.0.0.0:80, ignored
Jun 17 04:56:25 srv1699959 nginx[581716]: 2026/06/17 04:56:25 [warn] 581716#581716: conflicting server name "www.softdigitconsulting.com" on 0.0.0.0:80, ignored
Jun 17 04:56:25 srv1699959 nginx[581716]: 2026/06/17 04:56:25 [warn] 581716#581716: conflicting server name "softdigitconsulting.com" on 0.0.0.0:443, ignored
Jun 17 04:56:25 srv1699959 nginx[581716]: 2026/06/17 04:56:25 [warn] 581716#581716: conflicting server name "www.softdigitconsulting.com" on 0.0.0.0:443, ignored
Jun 17 04:56:25 srv1699959 systemd[1]: Started nginx.service - A high performance web server and a reverse proxy server.
