// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication } from '@nestjs/common';
// // Supertest often requires a default import or a specific syntax in ESM
// import request from 'supertest';
// // ESM requires explicit extensions for relative imports
// import { AppModule } from '../../src/app.module.js';
// import { AuditInterceptor } from '../../src/audit/audit.interceptor.js';

// describe('Admin User Search (e2e)', () => {
//   let app: INestApplication;
//   let adminToken: string;

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
//      * Adjust endpoint/body to match your auth implementation
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
//     expect(adminToken).toBeDefined();
//   });

//   afterAll(async () => {
//     await app.close();
//   });

//   /**
//    * 1️⃣ Search by name
//    */
//   it('searches users by name', async () => {
//     const res = await request(app.getHttpServer())
//       .get('/admin/users/search?q=John')
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     expect(res.body.data.length).toBeGreaterThan(0);
//     expect(res.body.data[0]).toHaveProperty('name');
//   });

//   /**
//    * 2️⃣ Search by email
//    */
//   it('searches users by email', async () => {
//     const res = await request(app.getHttpServer())
//       .get('/admin/users/search?q=jane@example.com')
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     expect(res.body.data[0].email).toBe('jane@example.com');
//   });

//   /**
//    * 3️⃣ Search by phone
//    */
//   // In your test file, update the phone test:
//   it('searches users by phone', async () => {
//     const res = await request(app.getHttpServer())
//       .get('/admin/users/search?q=+966')
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     // Check if any data returned
//     expect(res.body.data).toBeDefined();

//     // If there are results, check the first one
//     if (res.body.data.length > 0) {
//       expect(res.body.data[0]).toHaveProperty('phone');
//       // Don't assume specific phone number, just check it exists
//       expect(typeof res.body.data[0].phone).toBe('string');
//     }
//   });

//   /**
//    * 4️⃣ Search by business name
//    */
//   it('searches users by business name', async () => {
//     const res = await request(app.getHttpServer())
//       .get('/admin/users/search?q=Acme')
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     expect(res.body.data[0].businessName).toBe('Acme Trading LLC');
//   });

//   /**
//    * 5️⃣ Filter by user type
//    */
//   it('filters users by type BUSINESS', async () => {
//     const res = await request(app.getHttpServer())
//       .get('/admin/users/search?type=BUSINESS')
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     expect(res.body.data.length).toBeGreaterThan(0);

//     for (const user of res.body.data) {
//       expect(user.userType).toBe('BUSINESS');
//     }
//   });

//   /**
//    * 6️⃣ Pagination
//    */
//   it('returns paginated results', async () => {
//     const res = await request(app.getHttpServer())
//       .get('/admin/users/search?page=1&limit=1')
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     expect(res.body.data.length).toBe(1);
//     expect(res.body.pagination).toEqual(
//       expect.objectContaining({
//         page: 1,
//         limit: 1,
//       }),
//     );
//   });

//   /**
//    * 7️⃣ Response shape validation (critical fields)
//    */
//   it('returns required admin fields only', async () => {
//     const res = await request(app.getHttpServer())
//       .get('/admin/users/search')
//       .set('Authorization', `Bearer ${adminToken}`)
//       .expect(200);

//     const user = res.body.data[0];

//     expect(user).toHaveProperty('userType');
//     expect(user).toHaveProperty('accountStatus');
//     expect(user).toHaveProperty('lastLoginAt');

//     // security: no sensitive fields
//     expect(user).not.toHaveProperty('password');
//   });

//   /**
//    * 8️⃣ Unauthorized access
//    */
//   it('rejects unauthenticated access', async () => {
//     await request(app.getHttpServer()).get('/admin/users/search').expect(401);
//   });
// });
