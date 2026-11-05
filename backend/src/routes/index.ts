import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { LoanController } from '@/controllers/loan.controller';
import { PaymentController } from '@/controllers/payment.controller';
import { PeriodController } from '@/controllers/period.controller';
import { ConfigController } from '@/controllers/config.controller';
import { ReportController } from '@/controllers/report.controller';
import { authMiddleware, optionalAuthMiddleware } from '@/middleware/auth.middleware';
import { validateMiddleware } from '@/middleware/validate.middleware';
import { loginSchema, loanSchema, loanUpdateSchema, paymentSchema, configSchema } from '@/validators';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticar usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: rosita@cima.com }
 *               password: { type: string, example: Cima2025! }
 *               remember: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: Autenticación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/auth/login', validateMiddleware(loginSchema), AuthController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario autenticado
 *       401:
 *         description: No autenticado
 */
router.get('/auth/me', optionalAuthMiddleware, AuthController.me);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sesión cerrada
 */
router.post('/auth/logout', AuthController.logout);

/**
 * @swagger
 * /api/loans:
 *   get:
 *     summary: Listar todos los préstamos
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de préstamos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CustomerLoan'
 */
router.get('/loans', authMiddleware, LoanController.list);

/**
 * @swagger
 * /api/loans/{id}:
 *   get:
 *     summary: Obtener préstamo por ID
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Préstamo encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerLoan'
 *       404:
 *         description: Préstamo no encontrado
 */
router.get('/loans/:id', authMiddleware, LoanController.getById);

/**
 * @swagger
 * /api/loans:
 *   post:
 *     summary: Crear un nuevo préstamo
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerLoan'
 *     responses:
 *       201:
 *         description: Préstamo creado
 *       400:
 *         description: Datos inválidos
 */
router.post('/loans', authMiddleware, validateMiddleware(loanSchema), LoanController.create);

/**
 * @swagger
 * /api/loans/{id}:
 *   put:
 *     summary: Actualizar préstamo
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerLoan'
 *     responses:
 *       200:
 *         description: Préstamo actualizado
 *       404:
 *         description: Préstamo no encontrado
 */
router.put('/loans/:id', authMiddleware, validateMiddleware(loanUpdateSchema), LoanController.update);

/**
 * @swagger
 * /api/loans/{id}:
 *   delete:
 *     summary: Eliminar préstamo
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Préstamo eliminado
 *       404:
 *         description: Préstamo no encontrado
 */
router.delete('/loans/:id', authMiddleware, LoanController.delete);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Listar pagos (opcional filtrar por loanId)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: loanId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de pagos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payment'
 */
router.get('/payments', authMiddleware, PaymentController.list);

/**
 * @swagger
 * /api/payments/loan/{loanId}:
 *   get:
 *     summary: Obtener pagos de un préstamo
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Pagos del préstamo
 */
router.get('/payments/loan/:loanId', authMiddleware, PaymentController.getByLoan);

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Crear un nuevo pago
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [loanId, paymentDate, amount, type]
 *             properties:
 *               loanId: { type: integer }
 *               paymentDate: { type: string, format: 'date-time' }
 *               amount: { type: number }
 *               type: { type: string, enum: [Capital, Rédito] }
 *               periodNumber: { type: integer, nullable: true }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Pago creado
 *       400:
 *         description: Datos inválidos
 */
router.post('/payments', authMiddleware, validateMiddleware(paymentSchema), PaymentController.create);

/**
 * @swagger
 * /api/periods:
 *   get:
 *     summary: Listar todos los períodos
 *     tags: [Periods]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de períodos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Period'
 */
router.get('/periods', authMiddleware, PeriodController.list);

/**
 * @swagger
 * /api/periods/loan/{loanId}:
 *   get:
 *     summary: Obtener períodos de un préstamo
 *     tags: [Periods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Períodos del préstamo
 */
router.get('/periods/loan/:loanId', authMiddleware, PeriodController.getByLoan);

/**
 * @swagger
 * /api/periods/loan/{loanId}/regenerate:
 *   post:
 *     summary: Regenerar períodos de un préstamo
 *     tags: [Periods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Períodos regenerados
 */
router.post('/periods/loan/:loanId/regenerate', authMiddleware, PeriodController.regenerate);

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Obtener configuración del negocio
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusinessConfig'
 */
router.get('/config', authMiddleware, ConfigController.get);

/**
 * @swagger
 * /api/config:
 *   patch:
 *     summary: Actualizar configuración del negocio
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BusinessConfig'
 *     responses:
 *       200:
 *         description: Configuración actualizada
 */
router.patch('/config', authMiddleware, validateMiddleware(configSchema), ConfigController.update);

/**
 * @swagger
 * /api/reports/summary:
 *   get:
 *     summary: Obtener indicadores del dashboard
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Indicadores
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SummaryIndicators'
 */
router.get('/reports/summary', authMiddleware, ReportController.summary);

/**
 * @swagger
 * /api/reports/monthly-movement:
 *   get:
 *     summary: Obtener movimiento mensual
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2025 }
 *     responses:
 *       200:
 *         description: Movimiento mensual
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MonthlyMovement'
 */
router.get('/reports/monthly-movement', authMiddleware, ReportController.monthlyMovement);

export default router;
