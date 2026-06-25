import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { ResponseInterceptor } from '../src/common/response.interceptor';

describe('Records (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let categoryId: number;
  const username = 'rec_' + Math.floor(Math.random() * 1e6);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username, password: 'secret123' });
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username, password: 'secret123' });
    token = login.body.data.token;
    const cats = await request(app.getHttpServer())
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    categoryId = cats.body.data[0].id;
  });

  afterAll(async () => await app.close());

  it('creates, lists, updates, and deletes a record', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/records')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId,
        type: 'EXPENSE',
        amount: 12.5,
        note: 'lunch',
        recordDate: '2026-06-10',
      })
      .expect(201);
    const id = created.body.data.id;

    const one = await request(app.getHttpServer())
      .get(`/api/records/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(one.body.data.id).toBe(id);
    expect(one.body.data.category).toBeDefined();

    const list = await request(app.getHttpServer())
      .get('/api/records?month=2026-06')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .patch(`/api/records/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 20 })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/records/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('rejects record creation without token', async () => {
    await request(app.getHttpServer())
      .post('/api/records')
      .send({ categoryId, type: 'EXPENSE', amount: 5, recordDate: '2026-06-10' })
      .expect(401);
  });

  it('filters by from/to date range (inclusive)', async () => {
    const mk = (recordDate: string, amount: number) =>
      request(app.getHttpServer())
        .post('/api/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ categoryId, type: 'EXPENSE', amount, note: 'range', recordDate })
        .expect(201);
    await mk('2030-01-05', 1);
    await mk('2030-01-10', 2);
    await mk('2030-02-01', 3);

    const res = await request(app.getHttpServer())
      .get('/api/records?from=2030-01-01&to=2030-01-31&pageSize=200')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const dates = res.body.data.items.map((r: { recordDate: string }) => r.recordDate);
    expect(dates.every((d: string) => d >= '2030-01-01' && d < '2030-02-01')).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    expect(dates.some((d: string) => d.startsWith('2030-02'))).toBe(false);
  });
});
