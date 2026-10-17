/**
 * Academia Finance — contenido de las lecciones.
 *
 * Educación financiera general. No es asesoría legal, tributaria ni de
 * inversión personalizada. Las lecciones evitan a propósito normas,
 * impuestos o cifras que cambian con el tiempo: si en el futuro se agregan,
 * deben citar la fuente oficial y la fecha de actualización (campo `sources`).
 *
 * La sección "Aplicación a tu situación" se calcula con los datos reales
 * del usuario (LessonContext) y dice claramente cuando falta información.
 */
import type { Route } from 'next';
import { MIN_EXERCISE_LENGTH } from './constants';

export { MIN_EXERCISE_LENGTH };

export interface LessonContext {
  accountsCount: number;
  unreconciledAccounts: number;
  openDebtsCount: number;
  unconfirmedDebts: number;
  debtsWithUnknownInterest: number;
  debtCurrencies: string[];
  hasMonthlyBudget: boolean;
  essentialRecurringCount: number;
  subscriptionsCount: number;
  /** Equivalente mensual de suscripciones en la moneda principal. */
  subscriptionsMonthly: number;
  capacityStatus: 'unknown' | 'deficit' | 'tight' | 'surplus';
  hasEmergencyFund: boolean;
  emergencyFundMonths: number | null;
  goalsCount: number;
  netWorthIntegrity: number;
  monthsOfHistory: number;
  defaultCurrency: string;
}

export interface Lesson {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  order: number;
  title: string;
  minutes: number;
  explanation: string[];
  example: string;
  exercise: { prompt: string; placeholder: string };
  applyToMe: (ctx: LessonContext) => string;
  action: { label: string; href: Route };
  quiz: { question: string; options: string[]; correctIndex: number; explanation: string };
  xp: number;
  /** Solo si la lección cita normas o datos sensibles al tiempo. */
  sources?: { label: string; url: string; updatedAt: string }[];
}

export const LEVELS: Record<Lesson['level'], { title: string; description: string }> = {
  1: { title: 'Fundamentos', description: 'Ingresos, gastos, activos, pasivos y patrimonio.' },
  2: { title: 'Control del dinero', description: 'Gastos fijos y variables, flujo de caja y conciliación.' },
  3: { title: 'Deudas', description: 'Organizar, entender y negociar obligaciones.' },
  4: { title: 'Ahorro', description: 'Fondo de emergencia, metas y hábitos.' },
  5: { title: 'Crecimiento', description: 'Interés compuesto, inflación, riesgo y largo plazo.' },
};

const pending = 'Todavía no hay datos suficientes en Finance para aplicarlo a tu caso; ';

export const LESSONS: Lesson[] = [
  // ------------------------------------------------------------------ Nivel 1
  {
    id: 'fundamentos-ingresos-gastos-activos-pasivos',
    level: 1,
    order: 1,
    title: 'Ingresos, gastos, activos y pasivos',
    minutes: 4,
    explanation: [
      'Un ingreso es dinero que entra (salario, pagos de clientes). Un gasto es dinero que sale para pagar algo que consumes.',
      'Un activo es algo que tienes y vale dinero: saldo en cuentas, efectivo, inversiones, dinero que te deben. Un pasivo es lo que debes: préstamos, tarjetas, cuentas pendientes.',
      'Los ingresos y gastos son FLUJOS (pasan durante un periodo). Los activos y pasivos son SALDOS (lo que hay en un momento).',
    ],
    example:
      'Si este mes recibiste 3.000.000 y gastaste 2.600.000, tu flujo neto fue +400.000. Si tienes 1.000.000 en el banco y debes 5.000.000, tu activo es 1.000.000 y tu pasivo 5.000.000.',
    exercise: {
      prompt: 'Escribe dos activos y dos pasivos que tengas hoy (sin montos si no los sabes).',
      placeholder: 'Activos: … / Pasivos: …',
    },
    applyToMe: (c) =>
      c.accountsCount === 0 && c.openDebtsCount === 0
        ? `${pending}registra tus cuentas (activos) y tus deudas (pasivos) para verlos juntos.`
        : `Hoy tienes ${c.accountsCount} cuenta(s) registradas como activos y ${c.openDebtsCount} deuda(s) abiertas como pasivos.`,
    action: { label: 'Ver mi patrimonio', href: '/net-worth' },
    quiz: {
      question: '¿Cuál de estos es un pasivo?',
      options: [
        'El saldo de tu cuenta de ahorros',
        'El saldo pendiente de tu tarjeta de crédito',
        'El salario del mes',
        'Dinero que un amigo te debe',
      ],
      correctIndex: 1,
      explanation: 'Lo que debes es un pasivo. El dinero que te deben es un activo (cuenta por cobrar).',
    },
    xp: 30,
  },
  {
    id: 'fundamentos-patrimonio-neto',
    level: 1,
    order: 2,
    title: 'Cómo calcular tu patrimonio neto',
    minutes: 4,
    explanation: [
      'Patrimonio neto = activos − pasivos. Es una foto de tu situación en un momento.',
      'Puede ser negativo, y es normal al empezar a ordenar las finanzas. Lo importante es la tendencia.',
      'Para que la foto sea fiel: no sumes monedas distintas sin convertir, no cuentes dos veces el ahorro que ya está en tus cuentas y separa lo confirmado de lo estimado.',
    ],
    example:
      'Cuentas 1.200.000 + inversión 300.000 − tarjeta 900.000 − préstamo 2.000.000 = −1.400.000. Si en seis meses es −800.000, mejoraste 600.000.',
    exercise: {
      prompt: 'Sin mirar Finance: ¿crees que tu patrimonio hoy es positivo o negativo? ¿Por qué?',
      placeholder: 'Creo que es … porque …',
    },
    applyToMe: (c) =>
      c.accountsCount === 0
        ? `${pending}empieza registrando tus cuentas.`
        : `Tu patrimonio en Finance tiene ${c.netWorthIntegrity} % de datos confirmados. ${c.netWorthIntegrity < 70 ? 'Conciliar cuentas y confirmar saldos de deudas lo hará más preciso.' : 'Es una foto bastante fiable.'}`,
    action: { label: 'Abrir patrimonio', href: '/net-worth' },
    quiz: {
      question:
        'Tienes 500 en tu cuenta, de los cuales 200 están reservados para una meta. ¿Cuánto suma esa cuenta a tu patrimonio?',
      options: ['700', '500', '300', '200'],
      correctIndex: 1,
      explanation: 'La reserva ya está dentro de los 500: sumarla aparte la contaría dos veces.',
    },
    xp: 30,
  },
  {
    id: 'fundamentos-disponible-vs-comprometido',
    level: 1,
    order: 3,
    title: 'Dinero disponible vs. dinero comprometido',
    minutes: 3,
    explanation: [
      'No todo el saldo de tus cuentas está libre. Parte ya tiene destino: cuotas próximas, arriendo, servicios, reservas de ahorro.',
      'Dinero libre ≈ saldo − reservas − pagos que vencen antes de tu próximo ingreso.',
      'Registrar tus movimientos y presupuestar es lo que permite saber cuánto puedes gastar sin afectar obligaciones.',
    ],
    example:
      'Tienes 2.000.000, pagas arriendo de 1.100.000 en 5 días y apartaste 200.000 para emergencias: tu dinero libre real es 700.000.',
    exercise: {
      prompt: 'Lista los pagos que tienes antes de tu próximo ingreso.',
      placeholder: 'Arriendo …, servicios …',
    },
    applyToMe: (c) =>
      c.essentialRecurringCount === 0
        ? `${pending}marca tus gastos recurrentes esenciales para que el dashboard calcule lo comprometido.`
        : `Tienes ${c.essentialRecurringCount} gasto(s) esencial(es) registrados; el dashboard ya los considera como compromisos.`,
    action: { label: 'Registrar recurrentes', href: '/subscriptions' },
    quiz: {
      question: '¿Qué define mejor el dinero libre?',
      options: [
        'Todo el saldo de mis cuentas',
        'Saldo menos reservas y pagos próximos',
        'Mi salario mensual',
        'Lo que me queda después de ahorrar el 50 %',
      ],
      correctIndex: 1,
      explanation: 'El dinero libre descuenta lo que ya tiene destino.',
    },
    xp: 30,
  },
  // ------------------------------------------------------------------ Nivel 2
  {
    id: 'control-fijos-variables',
    level: 2,
    order: 1,
    title: 'Gastos fijos, variables y hormiga',
    minutes: 4,
    explanation: [
      'Fijos: se repiten con monto similar (arriendo, internet, cuotas). Variables: cambian (mercado, transporte, salidas).',
      'Los gastos hormiga son pequeños y frecuentes; por separado parecen insignificantes, pero sumados pesan.',
      'Los fijos se negocian o cambian de vez en cuando; los variables se controlan día a día.',
    ],
    example:
      'Un café de 6.000 cinco días a la semana son unos 130.000 al mes: lo mismo que algunos servicios fijos.',
    exercise: {
      prompt: 'Identifica un gasto hormiga tuyo y estima cuánto suma al mes.',
      placeholder: 'Gasto: … ≈ … al mes',
    },
    applyToMe: (c) =>
      c.monthsOfHistory < 1
        ? `${pending}con un mes completo de movimientos verás tus variables en el resumen mensual.`
        : `Tienes ${c.monthsOfHistory} mes(es) de historial: el dashboard separa tus gastos fijos, variables y suscripciones.`,
    action: { label: 'Ver resumen mensual', href: '/dashboard' },
    quiz: {
      question: '¿Cuál es un gasto variable?',
      options: ['Arriendo', 'Cuota del préstamo', 'Mercado de la semana', 'Plan de internet'],
      correctIndex: 2,
      explanation: 'El mercado cambia de una semana a otra.',
    },
    xp: 30,
  },
  {
    id: 'control-flujo-de-caja',
    level: 2,
    order: 2,
    title: 'Flujo de caja y presupuesto mensual',
    minutes: 5,
    explanation: [
      'El flujo de caja es el orden en que entra y sale el dinero. Puedes tener ingresos suficientes en el mes y aun así quedarte sin dinero un día concreto si los pagos llegan antes que los ingresos.',
      'Un presupuesto es un plan: cuánto destinas a cada categoría. Empieza por lo esencial, luego deudas, luego lo demás.',
      'Un presupuesto realista se basa en lo que gastas de verdad, no en lo que te gustaría gastar.',
    ],
    example: 'Si cobras el día 30 y el arriendo vence el 5, necesitas reservar el arriendo en cuanto cobras.',
    exercise: {
      prompt: 'Escribe tus 3 categorías de mayor gasto y un límite realista para cada una.',
      placeholder: 'Alimentación …, Transporte …, …',
    },
    applyToMe: (c) =>
      c.hasMonthlyBudget
        ? 'Ya tienes presupuestos mensuales: revisa cada semana cuánto llevas.'
        : 'Aún no tienes presupuestos mensuales; crear uno para tu categoría principal es un buen primer paso.',
    action: { label: 'Presupuestos', href: '/budgets' },
    quiz: {
      question: '¿En qué se debe basar un presupuesto realista?',
      options: [
        'En lo que gastan otras personas',
        'En lo que gasto de verdad',
        'En gastar cero en ocio',
        'En el ingreso del mejor mes',
      ],
      correctIndex: 1,
      explanation: 'Partir de tus datos reales evita metas imposibles.',
    },
    xp: 30,
  },
  {
    id: 'control-suscripciones-conciliacion',
    level: 2,
    order: 3,
    title: 'Suscripciones y conciliación de cuentas',
    minutes: 4,
    explanation: [
      'Las suscripciones se renuevan solas. Revisarlas cada cierto tiempo evita pagar por algo que ya no usas.',
      'Conciliar es comparar el saldo que dice Finance con el de tu banco o billetera. Si no coinciden, falta un movimiento o hay uno duplicado.',
      'Una cuenta conciliada convierte un saldo "calculado" en un saldo "confirmado".',
    ],
    example:
      'Finance dice 820.000, el banco 790.000: falta registrar un gasto de 30.000 (o hay un cargo que no reconoces).',
    exercise: {
      prompt: 'Elige una cuenta y anota el saldo que te muestra tu banco hoy.',
      placeholder: 'Cuenta … saldo …',
    },
    applyToMe: (c) =>
      `${c.subscriptionsCount ? `Tienes ${c.subscriptionsCount} suscripción(es) activas.` : 'No tienes suscripciones registradas.'} ${c.unreconciledAccounts ? `${c.unreconciledAccounts} cuenta(s) sin conciliar en 35 días.` : c.accountsCount ? 'Tus cuentas están conciliadas.' : ''}`.trim(),
    action: { label: 'Conciliar cuentas', href: '/accounts' },
    quiz: {
      question: 'Finance muestra 100.000 más que tu banco. ¿Qué es lo más probable?',
      options: [
        'El banco se equivocó',
        'Falta registrar algún gasto',
        'Tienes 100.000 extra',
        'Hay que borrar la cuenta',
      ],
      correctIndex: 1,
      explanation: 'Lo habitual es un gasto no registrado; revisa los movimientos del banco.',
    },
    xp: 30,
  },
  // ------------------------------------------------------------------ Nivel 3
  {
    id: 'deudas-organizar',
    level: 3,
    order: 1,
    title: 'Organizar tus deudas',
    minutes: 5,
    explanation: [
      'El primer paso no es pagar: es saber exactamente qué debes, a quién, en qué moneda, con qué condiciones y cuándo vence.',
      'Diferencia entre saldo original (lo que te prestaron) y saldo pendiente (lo que debes hoy). Con intereses y cargos, el pendiente puede ser mayor que el original menos lo pagado.',
      'Marca como "estimado" lo que no has confirmado con el acreedor. Un inventario honesto con datos incompletos vale más que uno "perfecto" inventado.',
    ],
    example:
      'Préstamo de 5.000.000, pagaste 12 cuotas de 300.000 (3.600.000). Eso no significa que debas 1.400.000: parte de cada cuota fue interés.',
    exercise: {
      prompt: 'Lista todas tus deudas, aunque no sepas el saldo exacto.',
      placeholder: 'Acreedor – moneda – saldo aproximado – fecha',
    },
    applyToMe: (c) =>
      c.openDebtsCount === 0
        ? 'No tienes deudas abiertas registradas. Si existe alguna, regístrala aunque falten datos; si no tienes, confírmalo en el inventario.'
        : `Tienes ${c.openDebtsCount} deuda(s) abiertas${c.debtCurrencies.length > 1 ? ` en ${c.debtCurrencies.join(' y ')}` : ''}; ${c.unconfirmedDebts} con saldo sin confirmar.`,
    action: { label: 'Ir a deudas', href: '/debts' },
    quiz: {
      question: 'Pagaste 1.000.000 de cuotas de un préstamo de 3.000.000 con intereses. ¿Cuánto debes?',
      options: [
        'Exactamente 2.000.000',
        'Probablemente más de 2.000.000; hay que confirmarlo',
        'Menos de 2.000.000',
        'Nada',
      ],
      correctIndex: 1,
      explanation: 'Parte de las cuotas cubre intereses, así que el capital baja menos de lo pagado.',
    },
    xp: 40,
  },
  {
    id: 'deudas-costo-y-tasas',
    level: 3,
    order: 2,
    title: 'Comparar tasas y el costo de una deuda',
    minutes: 5,
    explanation: [
      'Una tasa puede expresarse mensual o anual. 2 % mensual no es 24 % anual: por el efecto compuesto se acerca más a 26,8 % anual efectivo.',
      'Para comparar deudas, usa siempre la misma base (por ejemplo, efectiva anual) e incluye cargos y seguros.',
      'Endeudarse para pagar otra deuda solo ayuda si la nueva cuesta menos en total y no alarga indefinidamente el problema.',
    ],
    example:
      'Deuda A al 1,9 % mensual y deuda B al 22 % efectivo anual: A equivale a ~25,3 % anual, así que B es más barata.',
    exercise: {
      prompt: 'Para una deuda tuya, ¿sabes si su tasa es mensual o anual? Anótala.',
      placeholder: 'Deuda … tasa … (mensual/anual)',
    },
    applyToMe: (c) =>
      c.openDebtsCount === 0
        ? 'Sin deudas registradas: guarda esta lección para cuando compares créditos.'
        : c.debtsWithUnknownInterest
          ? `${c.debtsWithUnknownInterest} deuda(s) no tienen tasa o no indican si es mensual o anual: sin ese dato Finance no simula intereses.`
          : 'Todas tus deudas tienen tasa y periodo: puedes comparar escenarios en Deudas.',
    action: { label: 'Completar tasas', href: '/debts' },
    quiz: {
      question: '¿Cuál es más cara: 2 % mensual o 24 % efectivo anual?',
      options: ['Son iguales', '2 % mensual', '24 % efectivo anual', 'No se puede saber'],
      correctIndex: 1,
      explanation: '2 % mensual compuesto ≈ 26,8 % efectivo anual.',
    },
    xp: 40,
  },
  {
    id: 'deudas-negociar',
    level: 3,
    order: 3,
    title: 'Negociar y registrar acuerdos de pago',
    minutes: 5,
    explanation: [
      'Si no puedes pagar una cuota, contactar al acreedor antes de que pase mucho tiempo suele abrir más opciones (plazos, cuotas menores, refinanciación).',
      'Prepara la conversación: saldo que crees deber, cuánto puedes pagar de verdad al mes sin dejar de cubrir lo esencial y desde cuándo.',
      'Todo acuerdo debe quedar por escrito. Regístralo en Finance: nuevas cuotas, fechas y condiciones.',
    ],
    example:
      '"Hoy puedo pagar 150.000 al mes sin dejar de cubrir arriendo y comida. ¿Podemos acordar esa cuota por 12 meses?"',
    exercise: {
      prompt: 'Calcula cuánto podrías ofrecer al mes sin comprometer tus gastos esenciales.',
      placeholder: 'Ingreso … − esenciales … − otras cuotas … = …',
    },
    applyToMe: (c) =>
      c.capacityStatus === 'unknown'
        ? `${pending}con dos meses de ingresos y gastos podrás calcular una oferta realista.`
        : c.capacityStatus === 'deficit'
          ? 'Tus datos muestran que hoy lo esencial y las cuotas superan tus ingresos: es una buena razón para negociar plazos antes de comprometer más dinero.'
          : 'Tienes margen mensual; úsalo como límite máximo al proponer cuotas.',
    action: { label: 'Mi plan', href: '/plan' },
    quiz: {
      question: '¿Qué conviene ofrecer en una negociación?',
      options: [
        'La cuota que el acreedor pida',
        'Una cuota que puedas pagar sin dejar de cubrir lo esencial',
        'Todo tu ahorro de emergencia',
        'Nada hasta que te llamen',
      ],
      correctIndex: 1,
      explanation: 'Un acuerdo que no puedes cumplir empeora la situación.',
    },
    xp: 40,
  },
  // ------------------------------------------------------------------ Nivel 4
  {
    id: 'ahorro-fondo-emergencia',
    level: 4,
    order: 1,
    title: 'El fondo de emergencia',
    minutes: 4,
    explanation: [
      'Es dinero apartado para imprevistos (salud, reparación, pérdida de ingresos). Evita endeudarte cuando algo sale mal.',
      'Empieza pequeño: una semana de gastos esenciales ya ayuda. Luego un mes. A largo plazo se suelen buscar varios meses.',
      'Debe estar disponible rápido y sin riesgo de perder valor.',
    ],
    example:
      'Si tus gastos esenciales son 1.800.000 al mes, un primer objetivo de 450.000 (una semana larga) es alcanzable.',
    exercise: {
      prompt: '¿Cuál sería un primer objetivo pequeño y alcanzable para tu fondo?',
      placeholder: 'Objetivo: …',
    },
    applyToMe: (c) =>
      !c.hasEmergencyFund
        ? 'Aún no tienes una meta marcada como fondo de emergencia.'
        : c.emergencyFundMonths === null
          ? 'Tienes fondo de emergencia; registra tus gastos esenciales para saber cuántos meses cubre.'
          : `Tu fondo cubre ${c.emergencyFundMonths} mes(es) de gastos de vida.`,
    action: { label: 'Metas de ahorro', href: '/savings' },
    quiz: {
      question: '¿Para qué sirve principalmente el fondo de emergencia?',
      options: [
        'Invertir en acciones',
        'Cubrir imprevistos sin endeudarte',
        'Pagar vacaciones',
        'Prestar a amigos',
      ],
      correctIndex: 1,
      explanation: 'Su función es dar estabilidad ante lo inesperado.',
    },
    xp: 30,
  },
  {
    id: 'ahorro-metas-habitos',
    level: 4,
    order: 2,
    title: 'Metas de ahorro y hábitos',
    minutes: 4,
    explanation: [
      'Una buena meta tiene nombre, monto, fecha y aporte mensual. Aporte necesario = pendiente ÷ meses restantes.',
      'Ahorrar "lo que sobre" rara vez funciona; apartar al inicio del mes, aunque sea poco, crea el hábito.',
      'Si el ingreso cambia, ajusta la meta: mover la fecha no es fracasar.',
    ],
    example:
      'Meta de 1.200.000 en 8 meses → 150.000 al mes. Si solo puedes 100.000, la fecha realista es 12 meses.',
    exercise: {
      prompt: 'Define una meta con monto y fecha y calcula el aporte mensual.',
      placeholder: 'Meta … monto … fecha … aporte …',
    },
    applyToMe: (c) =>
      c.goalsCount
        ? `Tienes ${c.goalsCount} meta(s); en Ahorros ves el aporte necesario y escenarios.`
        : 'No tienes metas todavía.',
    action: { label: 'Crear meta', href: '/savings' },
    quiz: {
      question: 'Faltan 600.000 y quedan 4 meses. ¿Aporte mensual necesario?',
      options: ['100.000', '150.000', '200.000', '600.000'],
      correctIndex: 1,
      explanation: '600.000 ÷ 4 = 150.000.',
    },
    xp: 30,
  },
  {
    id: 'ahorro-compras-importantes',
    level: 4,
    order: 3,
    title: 'Planificar compras importantes',
    minutes: 3,
    explanation: [
      'Para una compra grande, compara pagar de contado (ahorrando antes) con financiarla: el costo total del crédito incluye intereses y cargos.',
      'Espera unos días antes de comprar algo no esencial: reduce las compras impulsivas.',
      'Pregúntate si la compra afecta tus pagos esenciales o tu fondo de emergencia.',
    ],
    example:
      'Un portátil de 3.000.000 a 24 cuotas puede terminar costando bastante más; ahorrarlo en 10 meses cuesta 3.000.000.',
    exercise: {
      prompt: 'Piensa en una compra que quieras hacer: ¿contado o crédito? ¿Cuánto costaría en total?',
      placeholder: 'Compra … opción … costo total …',
    },
    applyToMe: (c) =>
      c.capacityStatus === 'deficit'
        ? 'Con tus datos actuales, primero conviene estabilizar el flujo antes de compras grandes.'
        : 'Puedes crear una meta para la compra y ver cuándo llegarías.',
    action: { label: 'Metas de ahorro', href: '/savings' },
    quiz: {
      question: 'Al financiar una compra, ¿qué debes comparar?',
      options: [
        'Solo la cuota mensual',
        'El costo total, incluidos intereses y cargos',
        'El color',
        'El plazo más largo posible',
      ],
      correctIndex: 1,
      explanation: 'Una cuota baja con plazo largo puede costar mucho más en total.',
    },
    xp: 30,
  },
  // ------------------------------------------------------------------ Nivel 5
  {
    id: 'crecimiento-interes-compuesto-inflacion',
    level: 5,
    order: 1,
    title: 'Interés compuesto e inflación',
    minutes: 5,
    explanation: [
      'Interés compuesto: ganas (o pagas) intereses sobre intereses anteriores. Trabaja a tu favor en el ahorro y en tu contra en las deudas.',
      'La inflación es el aumento general de precios: el mismo dinero compra menos con el tiempo.',
      'Rendimiento real ≈ rendimiento nominal − inflación. Ganar 5 % con 6 % de inflación es perder poder de compra.',
    ],
    example: '1.000.000 al 1 % mensual compuesto durante 12 meses ≈ 1.126.825, no 1.120.000.',
    exercise: {
      prompt: 'Si una deuda cobra 3 % mensual, ¿cuánto crecerían 100.000 en 12 meses sin pagar?',
      placeholder: '≈ …',
    },
    applyToMe: (c) =>
      c.openDebtsCount
        ? 'El interés compuesto de tus deudas es la razón para priorizar las de mayor tasa cuando puedas pagar más.'
        : 'Sin deudas, el interés compuesto trabaja a tu favor cuando ahorras.',
    action: { label: 'Comparar escenarios de deuda', href: '/debts' },
    quiz: {
      question: 'Rendimiento 7 %, inflación 4 %. ¿Rendimiento real aproximado?',
      options: ['11 %', '7 %', '3 %', '−3 %'],
      correctIndex: 2,
      explanation: '7 % − 4 % ≈ 3 %.',
    },
    xp: 40,
  },
  {
    id: 'crecimiento-riesgo-diversificacion',
    level: 5,
    order: 2,
    title: 'Riesgo, rentabilidad y diversificación',
    minutes: 5,
    explanation: [
      'A mayor rentabilidad esperada, normalmente mayor riesgo de perder dinero. No existe rentabilidad alta garantizada: desconfía de quien la prometa.',
      'Diversificar es no depender de una sola inversión.',
      'Antes de invertir: fondo de emergencia, deudas caras controladas y claridad sobre tu tolerancia al riesgo y tu plazo.',
    ],
    example:
      'Una "inversión" que promete 10 % mensual garantizado es una señal de alerta, no una oportunidad.',
    exercise: {
      prompt: '¿Cuánto tiempo podrías dejar un dinero invertido sin necesitarlo?',
      placeholder: 'Plazo …',
    },
    applyToMe: (c) =>
      c.capacityStatus !== 'surplus' || !c.hasEmergencyFund
        ? 'Según tu plan, todavía no es momento de evaluar inversiones de riesgo: primero estabilidad y fondo de emergencia.'
        : 'Tienes base para empezar a evaluar opciones; define antes tu tolerancia al riesgo en Configuración.',
    action: { label: 'Mi plan', href: '/plan' },
    quiz: {
      question: '¿Qué indica una promesa de rentabilidad alta y "garantizada"?',
      options: ['Una gran oportunidad', 'Una señal de alerta', 'Que no hay riesgo', 'Que es diversificada'],
      correctIndex: 1,
      explanation: 'Rentabilidad alta y garantía rara vez van juntas.',
    },
    xp: 40,
  },
  {
    id: 'crecimiento-largo-plazo',
    level: 5,
    order: 3,
    title: 'Planificación a largo plazo',
    minutes: 4,
    explanation: [
      'El largo plazo se construye con hábitos sostenidos: registrar, presupuestar, pagar, ahorrar y revisar.',
      'Revisa tu plan al menos cada mes y ajusta cuando cambian tus ingresos o gastos.',
      'Aumentar ingresos (habilidades, clientes, nuevas fuentes) suele tener tanto impacto como recortar gastos.',
    ],
    example:
      'Revisar 20 minutos al mes durante un año son 4 horas que pueden ahorrarte mucho más en intereses y gastos olvidados.',
    exercise: {
      prompt: 'Escribe una meta financiera para dentro de 3 años.',
      placeholder: 'En 3 años quiero …',
    },
    applyToMe: (c) =>
      `Llevas ${c.monthsOfHistory} mes(es) de historial en Finance. Cada cierre mensual suma a esa perspectiva.`,
    action: { label: 'Mi progreso', href: '/progress' },
    quiz: {
      question: '¿Cada cuánto conviene revisar el plan financiero?',
      options: ['Nunca', 'Una vez al año', 'Al menos cada mes', 'Solo cuando hay problemas'],
      correctIndex: 2,
      explanation: 'Una revisión mensual permite ajustar a tiempo.',
    },
    xp: 40,
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export interface LessonCompletionCheck {
  passed: boolean;
  reason?: string;
}

export function checkLessonCompletion(
  lesson: Lesson,
  answerIndex: number,
  exerciseResponse: string
): LessonCompletionCheck {
  if (exerciseResponse.trim().length < MIN_EXERCISE_LENGTH) {
    return { passed: false, reason: `Completa el ejercicio (al menos ${MIN_EXERCISE_LENGTH} caracteres).` };
  }
  if (answerIndex !== lesson.quiz.correctIndex)
    return { passed: false, reason: 'Respuesta incorrecta. Revisa la explicación e inténtalo de nuevo.' };
  return { passed: true };
}

/** Siguiente lección sin completar, en orden de nivel. */
export function nextLesson(completedIds: Set<string>): Lesson | null {
  return (
    [...LESSONS]
      .sort((a, b) => a.level - b.level || a.order - b.order)
      .find((l) => !completedIds.has(l.id)) ?? null
  );
}

/** Un nivel se desbloquea al completar al menos 2 lecciones del anterior. */
export function isLevelUnlocked(level: Lesson['level'], completedIds: Set<string>): boolean {
  if (level === 1) return true;
  const previous = LESSONS.filter((l) => l.level === level - 1);
  return previous.filter((l) => completedIds.has(l.id)).length >= Math.min(2, previous.length);
}
