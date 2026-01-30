// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication } from '@nestjs/common';
// import request from 'supertest';
// import { AppModule } from '../../src/app.module.js';
// import { AuditInterceptor } from '../../src/audit/audit.interceptor.js';
// import { randomInt } from 'crypto';

// describe('Admin User Management Actions (e2e)', () => {
//   let app: INestApplication;
//   let adminToken: string;
//   let targetUserId: string;

//   beforeAll(async () => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile();

//     app = moduleFixture.createNestApplication();

//     // Apply audit interceptor globally
//     const auditInterceptor = app.get(AuditInterceptor);
//     app.useGlobalInterceptors(auditInterceptor);

//     await app.init();

//     /**
//      * 🔐 Login as admin
//      */
//     const loginRes = await request(app.getHttpServer())
//       .post('/admin/auth/login')
//       .send({
//         email: 'admin@marvalero.com',
//         password: 'admin123',
//       });

//     adminToken = loginRes.body.accessToken;
//     if (!adminToken) {
//       throw new Error('Admin login failed, no token received');
//     }

//     /**
//      * 🔍 Get a target user to operate on
//      */
//     const searchRes = await request(app.getHttpServer())
//       .get('/admin/users/search?q=John')
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     expect(searchRes.body.data.length).toBeGreaterThan(0);
//     targetUserId = searchRes.body.data[0].id;
//   });

//   /**
//    * 1️⃣ Force password reset
//    */
//   it('forces a password reset for a user', async () => {
//     const res = await request(app.getHttpServer())
//       .post(`/admin/users/${targetUserId}/reset-password`)
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(201);

//     expect(res.body).toEqual(
//       expect.objectContaining({
//         success: true,
//       }),
//     );
//   });

//   /**
//    * 2️⃣ Change email
//    */
//   it('changes user email', async () => {
//     const newEmail = `john.updated.${Date.now()}@example.com`;

//     const res = await request(app.getHttpServer())
//       .patch(`/admin/users/${targetUserId}/email`)
//       .set('Authorization', `Bearer ${adminToken}`)
//       .send({ email: newEmail })
//       .expect(200);

//     expect(res.body.success).toBe(true);

//     // verify via search
//     const verify = await request(app.getHttpServer())
//       .get(`/admin/users/search?q=${newEmail}`)
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     expect(verify.body.data[0].email).toBe(newEmail);
//   });

//   /**
//    * 3️⃣ Change phone
//    */
//   it('changes user phone number', async () => {
//     const newPhone = '+96655500011' + randomInt(1, 9);

//     // Change phone
//     await request(app.getHttpServer())
//       .patch(`/admin/users/${targetUserId}/phone`)
//       .set('Authorization', `Bearer ${adminToken}`)
//       .send({ phone: newPhone })
//       .expect(200);

//     // Verify by getting user directly instead of searching
//     const verify = await request(app.getHttpServer())
//       .get(`/admin/users/${targetUserId}`) // Add this endpoint
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     expect(verify.body.phone).toBe(newPhone);
//   });

//   /**
//    * 4️⃣ Disable (suspend) account
//    */
//   it('suspends a user account', async () => {
//     const res = await request(app.getHttpServer())
//       .patch(`/admin/users/${targetUserId}/status`)
//       .set('Authorization', `Bearer ${adminToken}`)
//       .send({ status: 'DISABLED' })
//       .expect(200);

//     expect(res.body.success).toBe(true);

//     const verify = await request(app.getHttpServer())
//       .get(`/admin/users/${targetUserId}`)
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     console.log('User after suspension:', verify.body);
//     expect(verify.body.status).toBe('DISABLED');
//   });

//   /**
//    * 5️⃣ Re-enable account
//    */
//   it('re-enables a user account', async () => {
//     const res = await request(app.getHttpServer())
//       .patch(`/admin/users/${targetUserId}/status`)
//       .set('Authorization', `Bearer ${adminToken}`)
//       .send({ status: 'ACTIVE' })
//       .expect(200);

//     expect(res.body.success).toBe(true);
//   });

//   /**
//    * 6️⃣ Invalid status should fail
//    */
//   it('rejects invalid account status', async () => {
//     await request(app.getHttpServer())
//       .patch(`/admin/users/${targetUserId}/status`)
//       .set('Authorization', `Bearer ${adminToken}`)
//       .send({ status: 'INVALID_STATUS' })
//       .expect(400);
//   });

//   /**
//    * 7️⃣ Unauthorized access blocked
//    */
//   it('rejects unauthenticated admin actions', async () => {
//     await request(app.getHttpServer())
//       .patch(`/admin/users/${targetUserId}/status`)
//       .send({ status: 'ACTIVE' })
//       .expect(401);
//   });

//   afterAll(async () => {
//     await app.close();
//   });
// });
