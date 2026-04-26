# ARWA LOGISTICS - منصة الشحن واللوجستيات

<p align="center">
  <strong>منصة متكاملة لإدارة الشحن واللوجستيات مبنية بتقنيات حديثة</strong>
</p>

---

## 📋 نظرة عامة

ARWA LOGISTICS هي منصة ويب شاملة لإدارة عمليات الشحن واللوجستيات، تدعم إدارة الشحنات والمستودعات والطرق والمستخدمين والمدفوعات وعروض الأسعار وتذاكر الدعم. تم بناؤها باستخدام أحدث التقنيات مع دعم كامل للغات المتعددة (العربية، الإنجليزية، الصينية) ونظام صلاحيات متقدم.

---

## 🛠️ التقنيات المستخدمة

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| **Next.js** | 16+ | إطار العمل الرئيسي (App Router) |
| **TypeScript** | 5+ | لغة البرمجة |
| **Prisma** | 6+ | ORM لقاعدة البيانات |
| **PostgreSQL** | 16 | قاعدة البيانات الرئيسية |
| **Redis** | 7 | التخزين المؤقت وتحديد المعدل |
| **RabbitMQ** | 3 | نظام الرسائل والطوابير |
| **Tailwind CSS** | 4 | تنسيق الواجهة |
| **Radix UI** | - | مكونات الواجهة |
| **React Query** | 5+ | إدارة حالة الخادم |
| **Zustand** | 5+ | إدارة حالة العميل |
| **Docker** | - | الحاويات والنشر |

---

## 🏗️ المعمارية

```
┌─────────────────────────────────────────────────────────┐
│                    العميل (Client)                       │
│  Next.js App Router + React + Tailwind CSS + Radix UI  │
├─────────────────────────────────────────────────────────┤
│                   طبقة الوسيط (Middleware)                │
│  JWT Authentication + RBAC + Redis Rate Limiting        │
├─────────────────────────────────────────────────────────┤
│                  طبقة API (API Routes)                   │
│  50+ API Endpoint مع Service Layer                      │
├─────────────────────────────────────────────────────────┤
│                 طبقة الخدمات (Services)                  │
│  AuthService + ShipmentService + UserService             │
├─────────────────────────────────────────────────────────┤
│              طبقة المستودعات (Repositories)              │
│  BaseRepository + 16 Model Repository                   │
├─────────────────────────────────────────────────────────┤
│                طبقة البيانات (Data Layer)                │
│  Prisma ORM + PostgreSQL + Redis + RabbitMQ             │
└─────────────────────────────────────────────────────────┘
```

### نمط المستودعات (Repository Pattern)

يتبع المشروع نمط المستودعات لفصل منطق الوصول للبيانات عن منطق الأعمال:

- **BaseRepository**: فئة أساسية توفر عمليات CRUD عامة مع دعم الصفحات
- **16 مستودع مخصص**: لكل نموذج في قاعدة البيانات مستودع خاص بعملياته
- **طبقة الخدمات**: تجمع بين عدة مستودعات لتنفيذ منطق الأعمال المعقد

### نظام الرسائل (Message Queue)

- **InMemoryBroker**: تنفيذ مبدئي للرسائل في الذاكرة
- **RabbitMQBroker**: تنفيذ جاهز للإنتاج عبر RabbitMQ
- يدعم الطوابير: `shipment.created`، `shipment.status_updated`، `payment.processed`، `notification.send`، `email.send`، `audit.log`، `report.generate`

---

## 📁 هيكل المشروع

```
arwa-logistics/
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                  # فحص مستمر (lint + test + build + security)
│   └── deploy.yml              # نشر الإنتاج
├── prisma/
│   └── schema.prisma           # مخطط قاعدة البيانات (16 نموذج + 5 enums)
├── src/
│   ├── app/
│   │   ├── api/                # 50+ API route
│   │   │   ├── admin/          # إدارة النظام
│   │   │   ├── auth/           # المصادقة
│   │   │   ├── shipments/      # الشحنات
│   │   │   ├── warehouses/     # المستودعات
│   │   │   ├── payments/       # المدفوعات
│   │   │   ├── quotations/     # عروض الأسعار
│   │   │   ├── tickets/        # تذاكر الدعم
│   │   │   ├── ai/             # المساعد الذكي
│   │   │   ├── notifications/  # الإشعارات
│   │   │   ├── health/         # فحص صحة النظام
│   │   │   └── ...
│   │   └── (pages)             # صفحات الواجهة
│   ├── lib/
│   │   ├── repositories/       # طبقة المستودعات (16 مستودع)
│   │   │   ├── base.repository.ts
│   │   │   ├── user.repository.ts
│   │   │   ├── shipment.repository.ts
│   │   │   └── ...
│   │   │   └── index.ts
│   │   ├── services/           # طبقة الخدمات
│   │   │   ├── auth.service.ts
│   │   │   ├── shipment.service.ts
│   │   │   ├── user.service.ts
│   │   │   └── index.ts
│   │   ├── __tests__/          # اختبارات الوحدة
│   │   │   ├── auth.test.ts
│   │   │   ├── logger.test.ts
│   │   │   ├── rate-limiter.test.ts
│   │   │   ├── queue.test.ts
│   │   │   ├── tracing.test.ts
│   │   │   └── base-repository.test.ts
│   │   ├── auth.ts             # نظام المصادقة (JWT + bcrypt)
│   │   ├── rbac.ts             # التحكم بالصلاحيات + تحديد المعدل
│   │   ├── rate-limiter.ts     # تحديد معدل الطلبات عبر Redis
│   │   ├── redis.ts            # عميل Redis
│   │   ├── queue.ts            # نظام الرسائل (InMemory + RabbitMQ)
│   │   ├── queue-handlers.ts   # معالجات الرسائل
│   │   ├── logger.ts           # التسجيل المنظم (Structured Logging)
│   │   ├── metrics.ts          # جمع المقاييس
│   │   ├── tracing.ts          # تتبع الطلبات
│   │   ├── db.ts               # Prisma Client
│   │   ├── email.ts            # نظام البريد
│   │   ├── event-emitter.ts    # أحداث SSE
│   │   ├── i18n/               # التدويل (3 لغات)
│   │   └── ...
│   └── middleware.ts           # وسيط الأمان والمصادقة
├── docker-compose.yml          # حاويات الإنتاج
├── docker-compose.dev.yml      # حاويات التطوير
├── Dockerfile                  # بناء الصورة
├── Caddyfile                   # خادم الوكيل العكسي
├── vitest.config.ts            # إعدادات الاختبارات
└── package.json
```

---

## 🔐 نظام الصلاحيات (RBAC)

| الدور | الوصف | الصلاحيات |
|------|------|-----------|
| **ADMIN** | مدير النظام | الوصول الكامل لجميع الموارد |
| **WAREHOUSE_STAFF** | موظف المستودع | إدارة المستودعات والشحنات |
| **CUSTOMER** | العميل | إدارة شحناته ومدفوعاته وتذاكره |

### حماية المسارات

- المسارات العامة: `/api/auth`، `/api/tracking`، `/api/calculate-rate`، `/api/countries`، `/api/routes`
- مسارات المدير: `/api/admin/*` (ADMIN فقط)
- مسارات المستودعات: `/api/warehouses/*` (ADMIN + WAREHOUSE_STAFF)
- باقي المسارات: تتطلب مصادقة فقط

---

## 🌍 التدويل (i18n)

يدعم المشروع ثلاث لغات:

| اللغة | الكود | اتجاه النص |
|-------|-------|-----------|
| العربية | `ar` | RTL (من اليمين لليسار) |
| الإنجليزية | `en` | LTR |
| الصينية | `zh` | LTR |

أكثر من 800 مفتاح ترجمة لكل لغة.

---

## 🚀 التشغيل

### المتطلبات

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- RabbitMQ 3+ (اختياري)

### التشغيل باستخدام Docker

```bash
# تشغيل خدمات التطوير (PostgreSQL + Redis + RabbitMQ)
docker compose -f docker-compose.dev.yml up -d

# تثبيت التبعيات
npm install

# إعداد قاعدة البيانات
npx prisma generate
npx prisma db push

# تشغيل الخادم
npm run dev
```

### التشغيل الكامل بالإنتاج

```bash
# بناء وتشغيل جميع الحاويات
docker compose up -d
```

### متغيرات البيئة

```env
# قاعدة البيانات
DATABASE_URL="postgresql://arwa:password@localhost:5432/arwa_logistics?schema=public"

# المصادقة
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://user:password@localhost:5672

# التطبيق
NODE_ENV=development
APP_PORT=3000
```

---

## 🧪 الاختبارات

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل في وضع المراقبة
npm run test:watch

# تشغيل مع التغطية
npm run test:coverage
```

### ملفات الاختبار

| الملف | الاختبارات | الوصف |
|-------|-----------|-------|
| `auth.test.ts` | 11 | تجزئة كلمات المرور، JWT، التحقق القديم |
| `logger.test.ts` | 4 | التسجيل المنظم، المسجلات الفرعية |
| `rate-limiter.test.ts` | 5 | مستويات تحديد المعدل |
| `queue.test.ts` | 5 | نظام الرسائل، DLQ |
| `tracing.test.ts` | 4 | تتبع الطلبات |
| `base-repository.test.ts` | 2 | هيكل الصفحات |

---

## 🔄 CI/CD

### خط أنابيب CI

يعمل تلقائياً عند كل push أو pull request:

1. **Lint & TypeCheck**: فحص الكود والتدقيق النوعي
2. **Unit Tests**: اختبارات الوحدة مع PostgreSQL و Redis
3. **Build**: بناء التطبيق
4. **Docker Build**: بناء صورة Docker (فقط على main)
5. **Security Audit**: فحص أمني للحزم

### النشر

يتم النشر تلقائياً عند إنشاء tag من نوع `v*`:

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 📊 المراقبة (Observability)

### التسجيل المنظم (Structured Logging)

جميع السجلات بتنسيق JSON منظم:

```json
{
  "timestamp": "2026-04-26T12:00:00.000Z",
  "level": "info",
  "message": "Shipment created",
  "service": "arwa-logistics:api",
  "shipmentId": "ARWA-2026-000152",
  "traceId": "abc-123"
}
```

مسجلات فرعية: `apiLogger`، `dbLogger`، `authLogger`، `redisLogger`، `queueLogger`، `metricsLogger`

### المقاييس (Metrics)

- **عدادات**: طلبات API، أخطاء الاتصال
- **مقاييس**: اتصالات نشطة
- **مدرجات تكرارية**: مدة طلبات API، مدة استعلامات DB (p50/p95/p99)
- تدفق تلقائي كل 30 ثانية

### تتبع الطلبات (Tracing)

- معرف تتبع فريد لكل طلب
- امتدادات متداخلة (Nested Spans)
- أحداث وسمات مخصصة
- دالة `withTracing()` للف تحميلات API

### فحص الصحة (Health Check)

```
GET /api/health
```

يرجع حالة قاعدة البيانات و Redis والمقاييس.

---

## 🛡️ الأمان

- **JWT المصادقة**: رموز HS256 مع انتهاء صلاحية 7 أيام
- **bcrypt تجزئة**: 12 جولة مع دعم SHA-256 القديم
- **Rate Limiting**: عبر Redis مع حدود مختلفة لكل نوع مسار
- **رؤوس الأمان**: X-Frame-Options: DENY، X-Content-Type-Options: nosniff، إلخ
- **التحقق من المدخلات**: عبر Zod schemas
- **سجل التدقيق**: تسجيل جميع العمليات الحساسة

### مستويات تحديد المعدل

| النوع | الحد | النافذة |
|------|------|---------|
| المصادقة | 10 طلبات | 15 دقيقة |
| API عام | 60 طلب | دقيقة |
| AI chat | 10 طلبات | دقيقة |
| رفع ملفات | 20 طلب | دقيقة |
| تتبع عام | 30 طلب | دقيقة |

---

## 📦 نماذج قاعدة البيانات

| النموذج | الوصف | الجدول |
|---------|-------|--------|
| User | المستخدمون | users |
| Shipment | الشحنات | shipments |
| ShipmentTracking | تتبع الشحنات | shipment_tracking |
| ShipmentPhoto | صور الشحنات | shipment_photos |
| Warehouse | المستودعات | warehouses |
| Country | الدول | countries |
| ShippingRoute | طرق الشحن | shipping_routes |
| AuditLog | سجل التدقيق | audit_logs |
| EmailLog | سجل البريد | email_logs |
| Notification | الإشعارات | notifications |
| Payment | المدفوعات | payments |
| ChatMessage | رسائل الدردشة | chat_messages |
| PasswordReset | إعادة تعيين كلمة المرور | password_resets |
| Setting | الإعدادات | settings |
| SupportTicket | تذاكر الدعم | support_tickets |
| TicketMessage | رسائل التذاكر | ticket_messages |
| Quotation | عروض الأسعار | quotations |

**40+ فهرس** لتحسين أداء الاستعلامات.

---

## 🚧 خارطة الطريق

### المرحلة الحالية (مكتملة)

- [x] اعتماد PostgreSQL في الإنتاج
- [x] Redis Rate Limiting
- [x] نمط المستودعات (Repository Pattern) لجميع النماذج
- [x] طبقة الخدمات (Service Layer)
- [x] اختبارات الوحدة (Vitest)
- [x] خط أنابيب CI/CD (GitHub Actions)
- [x] المراقبة: تسجيل منظم + مقاييس + تتبع
- [x] تجهيز RabbitMQ/Kafka
- [x] دعم التدويل (عربي + إنجليزي + صيني)
- [x] نظام الصلاحيات (RBAC)
- [x] فحص صحة النظام

### المرحلة التالية

- [ ] HttpOnly Cookies بدلاً من localStorage
- [ ] تكامل البريد الفعلي (SMTP)
- [ ] تكامل بوابات الدفع
- [ ] لوحة تحكم تحليلية متقدمة
- [ ] تطبيق الهاتف المحمول
- [ ] webhook للتكامل مع أنظمة خارجية
- [ ] دعم WebSocket للإشعارات الفورية
- [ ] نسخ احتياطي تلقائي لقاعدة البيانات

---

## 📄 الترخيص

مشروع خاص - جميع الحقوق محفوظة
