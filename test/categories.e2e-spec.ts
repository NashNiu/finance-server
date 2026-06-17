import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { ResponseInterceptor } from '../src/common/response.interceptor';

describe('Categories two-level (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let firstLevelId: number;
  const username = 'cat_' + Math.floor(Math.random() * 1e6);

  const auth = (req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);

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

    const cats = await auth(request(app.getHttpServer()).get('/api/categories'));
    // first system first-level EXPENSE category (parentId === null)
    firstLevelId = cats.body.data.find(
      (c: { parentId: number | null; type: string }) =>
        c.parentId === null && c.type === 'EXPENSE',
    ).id;
  });

  afterAll(async () => await app.close());

  it('seeds first-level + subcategories', async () => {
    const res = await auth(
      request(app.getHttpServer()).get('/api/categories'),
    ).expect(200);
    const list = res.body.data as { parentId: number | null }[];
    expect(list.some((c) => c.parentId === null)).toBe(true);
    expect(list.some((c) => c.parentId !== null)).toBe(true);
  });

  it('creates a subcategory under a first-level category', async () => {
    const res = await auth(
      request(app.getHttpServer())
        .post('/api/categories')
        .send({
          name: '测试二级',
          icon: 'food-o',
          type: 'EXPENSE',
          parentId: firstLevelId,
        }),
    ).expect(201);
    expect(res.body.data.parentId).toBe(firstLevelId);

    // clean up
    await auth(
      request(app.getHttpServer()).delete(
        `/api/categories/${res.body.data.id}`,
      ),
    ).expect(200);
  });

  it('rejects nesting under a subcategory', async () => {
    const sub = await auth(
      request(app.getHttpServer())
        .post('/api/categories')
        .send({
          name: '父级测试',
          icon: 'food-o',
          type: 'EXPENSE',
          parentId: firstLevelId,
        }),
    ).expect(201);

    await auth(
      request(app.getHttpServer())
        .post('/api/categories')
        .send({
          name: '三级非法',
          icon: 'food-o',
          type: 'EXPENSE',
          parentId: sub.body.data.id,
        }),
    ).expect(409);

    await auth(
      request(app.getHttpServer()).delete(
        `/api/categories/${sub.body.data.id}`,
      ),
    ).expect(200);
  });
});
