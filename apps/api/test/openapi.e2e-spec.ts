import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import SwaggerParser from '@apidevtools/swagger-parser';
import { AppModule } from '../src/app.module';

/**
 * Smoke test that the Swagger document we ship is structurally valid OpenAPI.
 * Catches refactors that introduce dangling `$ref`s, missing schemas, or
 * controllers that break Swagger metadata. Skipped when DATABASE_URL is unset
 * so PR runs without a database don't fail.
 */
describe('OpenAPI document', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('builds a valid OpenAPI 3 document via swagger-parser', async () => {
    if (!app) return;
    const config = new DocumentBuilder()
      .setTitle('Retail IMS API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh')
      .build();
    const document = SwaggerModule.createDocument(app, config);

    // SwaggerParser mutates input by resolving `$ref`s; clone first so the test
    // doesn't bleed into anything else that consumes the document.
    const cloned = JSON.parse(JSON.stringify(document));
    await expect(SwaggerParser.validate(cloned)).resolves.toBeDefined();

    // Sanity assertions on the surface area we expect to be stable.
    expect(document.openapi).toMatch(/^3\./);
    expect(Object.keys(document.paths ?? {}).length).toBeGreaterThan(0);
  });
});
