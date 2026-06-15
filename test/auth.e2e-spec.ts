import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { ResponseInterceptor } from '../src/common/response.interceptor';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const username = 'tester_' + Math.floor(Math.random() * 1e6);

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
  });

  afterAll(async () => await app.close());

  it('registers a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username, password: 'secret123' })
      .expect(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects duplicate registration', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username, password: 'secret123' })
      .expect(409);
  });

  it('logs in and reads profile', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username, password: 'secret123' })
      .expect(201);
    const token = login.body.data.token;
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body.data.username).toBe(username);
  });

  it('rejects profile without token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
