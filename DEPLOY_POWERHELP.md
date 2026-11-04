# 📋 Sistema de Gestión de Préstamos - Frontend (Basado en Excel Original)

## Fuente de Requisitos

El frontend está construido estrictamente sobre la estructura del archivo:
`Control_Prestamos_Rosita_Mejorado (1).xlsx`

Todas las columnas, fórmulas, tasas, estados y reglas de negocio se han replicado desde las hojas:
- **Resumen** - Indicadores y rentabilidad
- **Registro** - Registro y control de préstamos
- **Pagos** - Registro de pagos con diferenciación Capital/Rédito
- **Periodos** - Calendario de vencimientos
- **Configuración** - Parámetros del negocio

---

## Ejecución en Windows (PowerShell)

Todos los comandos se ejecutan desde la carpeta raíz del proyecto:

```powershell
Set-Location "C:\ruta\al\proyecto\Gastos"
```

### 1. Instalar dependencias

```powershell
npm install
```

### 2. Ejecutar en modo desarrollo

```powershell
npm run dev
```

La aplicación estará disponible en: `http://localhost:5173`

### 3. Construir para producción

```powershell
npm run build
```

Los archivos estáticos se generan en la carpeta `dist/`.

### 4. Previsualizar build de producción

```powershell
npm run preview
```

### 5. Ejecutar linter (ESLint)

```powershell
npm run lint
```

### 6. Verificar TypeScript

```powershell
npx tsc --noEmit
```

---

## Estructura del Proyecto

```
Gastos/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
├── DEPLOY_POWERHELP.md
├── dist/ (generado tras npm run build)
├── node_modules/
├── public/
└── src/
    ├── main.tsx
    ├── index.css
    ├── app/
    │   └── App.tsx
    ├── components/
    │   └── ui/
    │       ├── alert.tsx
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── input.tsx
    │       ├── modal.tsx
    │       └── table.tsx
    ├── hooks/
    │   └── useStorage.ts
    ├── layouts/
    │   ├── MainLayout.tsx
    │   └── Sidebar.tsx
    ├── services/
    │   └── mock/
    │       ├── data.ts
    │       └── storage.ts
    ├── types/
    │   └── index.ts
    └── features/
        ├── dashboard/
        │   └── Dashboard.tsx
        ├── clients/
        │   ├── ClientsList.tsx
        │   ├── ClientDetail.tsx
        │   └── index.ts
        ├── loans/
        │   ├── LoansList.tsx
        │   ├── LoanDetail.tsx
        │   └── index.ts
        ├── payments/
        │   ├── PaymentsList.tsx
        │   └── index.ts
        ├── periods/
        │   ├── PeriodsList.tsx
        │   └── index.ts
        ├── reports/
        │   ├── ReportsPage.tsx
        │   └── index.ts
        └── settings/
            ├── SettingsPage.tsx
            └── index.ts
```

---

## Reglas de Negocio (desde el Excel)

### Tasas de rédito
| Modalidad | Tasa | Origen |
|-----------|------|--------|
| Quincenal | 10% (0.1) | Configuración!$B$4 |
| Mensual | 20% (0.2) | Configuración!$B$5 |

### Cálculos clave
- **Rédito por período** = Capital prestado × Tasa por período
- **Capital pendiente** = MAX(0, Capital prestado - Capital abonado)
- **Estado del préstamo**: Capital pagado / Falta fecha / En seguimiento / Activo
- **Estado del período**: Capital pagado / Rédito pagado / Pendiente vencido / Por pagar
- **Máximo períodos por préstamo**: 36
- **Validación de pagos**: OK / ⚠ Datos incompletos / ⚠ ID no existe / ⚠ Falta N.º período

### Indicadores del Resumen
- Capital total prestado, Capital por recuperar, Capital recuperado
- % de capital recuperado, Réditos cobrados (ganancia real)
- Rentabilidad sobre lo prestado
- Réditos vencidos sin cobrar, Réditos pendientes del calendario
- Total de dinero recibido
- Préstamos activos, en seguimiento, sin fecha, capital pagado
- Pagos por revisar

---

## Módulos Implementados

| Módulo | Ruta | Hoja Excel |
|--------|------|------------|
| Resumen (Dashboard) | `/` | Resumen |
| Registro de Préstamos | `/prestamos` | Registro |
| Detalle de Préstamo | `/prestamos/:id` | Registro + Periodos |
| Pagos | `/pagos` | Pagos |
| Periodos de Pago | `/periodos` | Periodos |
| Resumen y Rentabilidad | `/reportes` | Resumen |
| Configuración | `/configuracion` | Configuración |

---

## Tecnologías Instaladas

- React 19 con TypeScript (strict mode)
- Vite - bundler y dev server
- React Router DOM - navegación
- Tailwind CSS - estilos
- Lucide React - iconos
- Recharts - gráficos
- React Hook Form + Zod - formularios y validación
- Zustand - estado global (UI)
- LocalStorage - persistencia de datos demo

---

## Pruebas Realizadas

- ✅ TypeScript: `tsc --noEmit` - sin errores
- ✅ Build: `npm run build` - compilación exitosa
- ✅ ESLint: `npm run lint` - solo warnings menores
- ✅ Navegación: todas las rutas funcionales
- ✅ Formularios: validaciones activas
- ✅ Persistencia: LocalStorage funcional
- ✅ Responsive: sidebar en escritorio, menú hamburguesa en móvil
- ✅ Cálculos fieles al Excel: tasas, estados, validaciones

---

## Comandos Resumidos (PowerShell)

```powershell
# Instalar
npm install

# Desarrollo
npm run dev

# Producción
npm run build
npm run preview

# Calidad
npm run lint
npx tsc --noEmit
```

---

**IMPORTANTE: Esta es exclusivamente la Fase 1 (Frontend). No se ha desarrollado backend.**
