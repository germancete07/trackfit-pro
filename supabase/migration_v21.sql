-- Migration v21: Exercise library expansion + library_exercise_id tracking

-- 1. Make trainer_id nullable (global exercises have trainer_id = null)
ALTER TABLE public.exercise_library
  ALTER COLUMN trainer_id DROP NOT NULL;

-- 2. Add new columns
ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS pattern text,
  ADD COLUMN IF NOT EXISTS muscle_primary text,
  ADD COLUMN IF NOT EXISTS muscle_secondary text,
  ADD COLUMN IF NOT EXISTS equipment text,
  ADD COLUMN IF NOT EXISTS level int DEFAULT 2,
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

-- 3. Backfill muscle_primary from muscle_group for existing trainer exercises
UPDATE public.exercise_library
SET muscle_primary = muscle_group
WHERE muscle_primary IS NULL AND muscle_group IS NOT NULL;

-- 4. Add library_exercise_id to template_exercises (nullable FK)
ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS library_exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL;

-- 5. Add library_exercise_id to session exercises
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS library_exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL;

-- 6. RLS: allow all authenticated users to read global exercises
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'exercise_library'
      AND policyname = 'Allow reading global exercises'
  ) THEN
    EXECUTE '
      CREATE POLICY "Allow reading global exercises"
        ON public.exercise_library
        FOR SELECT
        USING (is_global = true)
    ';
  END IF;
END $$;

-- 7. Insert 97 global exercises
INSERT INTO public.exercise_library
  (trainer_id, name, name_en, pattern, muscle_group, muscle_primary, muscle_secondary, equipment, level, is_global, description)
VALUES

-- ── RODILLA DOMINANTE (10) ─────────────────────────────────────────────────────
(null,'Sentadilla con barra trasera','Back Squat','rodilla','piernas','Cuádriceps','Glúteos','Barra',2,true,'Pies al ancho de hombros, barra sobre los trapecios. Bajar hasta muslos paralelos o más. Rodillas alineadas con los pies.'),
(null,'Sentadilla frontal con barra','Front Squat','rodilla','piernas','Cuádriceps','Core','Barra',3,true,'Barra apoyada en los deltoides anteriores. Mayor exigencia de movilidad de tobillo. Core muy activo.'),
(null,'Sentadilla goblet con mancuerna','Goblet Squat','rodilla','piernas','Cuádriceps','Glúteos','Mancuerna',1,true,'Sostener la mancuerna verticalmente frente al pecho. Excelente para aprender la mecánica de la sentadilla.'),
(null,'Prensa de piernas','Leg Press','rodilla','piernas','Cuádriceps','Glúteos','Máquina',1,true,'Pies al ancho de hombros en la plataforma. Bajar hasta 90° de rodilla. No despegar lumbares del respaldo.'),
(null,'Extensión de cuádriceps en máquina','Leg Extension','rodilla','piernas','Cuádriceps',null,'Máquina',1,true,'Extender completamente y bajar con control en 2–3 segundos. Aislamiento para el cuádriceps.'),
(null,'Hack squat en máquina','Hack Squat','rodilla','piernas','Cuádriceps','Glúteos','Máquina',2,true,'Hombros bajo los apoyos, pies en la plataforma. Bajar profundo controlando las rodillas.'),
(null,'Sentadilla sumo con barra','Sumo Squat','rodilla','piernas','Cuádriceps','Aductores','Barra',2,true,'Pies muy abiertos con puntas hacia afuera. Mayor activación de aductores y glúteos internos.'),
(null,'Sentadilla en Smith','Smith Machine Squat','rodilla','piernas','Cuádriceps','Glúteos','Máquina Smith',1,true,'La barra guiada reduce la exigencia de estabilización. Útil para aprendizaje o rehabilitación.'),
(null,'Sentadilla a cajón','Box Squat','rodilla','piernas','Cuádriceps','Glúteos','Barra + cajón',2,true,'Sentarse brevemente en el cajón y volver. Entrena la fase excéntrica y elimina el rebote elástico.'),
(null,'Leg press unilateral','Single-Leg Press','rodilla','piernas','Cuádriceps','Glúteos','Máquina',2,true,'Con un solo pie en la plataforma. Identifica y corrige desequilibrios entre piernas.'),

-- ── CADERA DOMINANTE (10) ─────────────────────────────────────────────────────
(null,'Peso muerto convencional','Conventional Deadlift','cadera','gluteos','Isquiotibiales','Espalda baja','Barra',2,true,'Agarre al ancho de caderas, espalda neutra. Empujar el suelo hacia abajo al iniciar el tirón. No redondear lumbar.'),
(null,'Peso muerto rumano','Romanian Deadlift','cadera','gluteos','Isquiotibiales','Glúteos','Barra',2,true,'Rodillas casi extendidas. Bajar inclinando el torso hasta sentir el estiramiento de isquiotibiales. Espalda neutra.'),
(null,'Peso muerto sumo','Sumo Deadlift','cadera','gluteos','Isquiotibiales','Aductores','Barra',2,true,'Postura muy abierta, puntas hacia afuera. Agarre en pronación entre las piernas. Menor recorrido lumbar.'),
(null,'Hip thrust con barra','Hip Thrust','cadera','gluteos','Glúteos','Isquiotibiales','Barra + banco',1,true,'Hombros apoyados en banco, barra sobre las caderas. Empujar caderas hasta alinear con el torso. Contraer glúteos arriba.'),
(null,'Puente de glúteos en suelo','Glute Bridge','cadera','gluteos','Glúteos','Isquiotibiales','Peso corporal',1,true,'Acostado, pies plantados cerca de los glúteos. Empujar las caderas hacia arriba. Se puede progresar con disco o barra.'),
(null,'Curl femoral acostado en máquina','Lying Leg Curl','cadera','piernas','Isquiotibiales',null,'Máquina',1,true,'Flexionar hasta aproximarse al glúteo. Mantener la cadera pegada al banco. Aislamiento de isquiotibiales.'),
(null,'Curl femoral sentado en máquina','Seated Leg Curl','cadera','piernas','Isquiotibiales',null,'Máquina',1,true,'Mayor estiramiento inicial que el curl acostado. Activación adicional del bíceps femoral largo.'),
(null,'Good morning con barra','Good Morning','cadera','piernas','Isquiotibiales','Espalda baja','Barra',3,true,'Barra sobre trapecios, rodillas semiflexionadas. Inclinar torso hacia adelante manteniendo espalda recta.'),
(null,'Kettlebell swing','Kettlebell Swing','cadera','gluteos','Glúteos','Isquiotibiales','Kettlebell',2,true,'El movimiento es una bisagra de cadera explosiva, no una sentadilla. Proyectar las caderas hacia adelante.'),
(null,'Cable pull-through','Cable Pull-Through','cadera','gluteos','Glúteos','Isquiotibiales','Polea',2,true,'De espaldas a la polea baja, tomar la cuerda entre las piernas. Bisagra de cadera con extensión completa.'),

-- ── UNILATERAL (8) ────────────────────────────────────────────────────────────
(null,'Zancadas con mancuernas','Walking Lunges','unilateral','piernas','Cuádriceps','Glúteos','Mancuernas',1,true,'Un pie adelante, bajar la rodilla trasera cerca del suelo. Torso erecto. Empujar con el talón delantero.'),
(null,'Zancada inversa','Reverse Lunge','unilateral','piernas','Cuádriceps','Glúteos','Mancuernas',1,true,'Dar un paso hacia atrás bajando la rodilla al suelo. Más segura para rodillas que la zancada frontal.'),
(null,'Step-up con mancuernas','Step-Up','unilateral','piernas','Cuádriceps','Glúteos','Mancuernas + banco',1,true,'Subir al banco empujando con el talón del pie que sube. Evitar empujar con el pie trasero.'),
(null,'Sentadilla búlgara','Bulgarian Split Squat','unilateral','piernas','Cuádriceps','Glúteos','Mancuernas + banco',2,true,'Pie trasero elevado en banco. Bajar la rodilla trasera casi al suelo. Gran activador de glúteos y cuádriceps.'),
(null,'Peso muerto a una pierna','Single-Leg RDL','unilateral','gluteos','Isquiotibiales','Glúteos','Mancuerna',3,true,'Gran exigencia de equilibrio y estabilidad. Bajar la mancuerna manteniéndola cerca del cuerpo. Cadera nivelada.'),
(null,'Hip thrust unilateral','Single-Leg Hip Thrust','unilateral','gluteos','Glúteos','Isquiotibiales','Banco',2,true,'Una pierna elevada, la otra extiende la cadera. Excelente para identificar asimetrías entre lados.'),
(null,'Curl martillo alternado','Alternating Hammer Curl','unilateral','biceps','Bíceps','Antebrazo','Mancuernas',1,true,'Agarre neutro, alternar brazos. Trabaja el braquiorradial además del bíceps. No balancear el torso.'),
(null,'Press con mancuerna unilateral','Single-Arm DB Press','unilateral','pecho','Pecho','Tríceps','Mancuerna',2,true,'Presionar con un solo brazo a la vez. Requiere estabilización antirotacional del core.'),

-- ── EMPUJE HORIZONTAL (10) ───────────────────────────────────────────────────
(null,'Press banca con barra','Barbell Bench Press','empuje-h','pecho','Pecho','Tríceps','Barra',2,true,'Acostado en el banco, bajar la barra hasta el pecho a la altura de los pezones. Codos a 45°. Empujar explosivamente al subir.'),
(null,'Press banca con mancuernas','Dumbbell Bench Press','empuje-h','pecho','Pecho','Tríceps','Mancuernas',1,true,'Mayor rango de movimiento que con barra. Al bajar, los codos van ligeramente por debajo del banco.'),
(null,'Press banca inclinado con barra','Incline Barbell Bench Press','empuje-h','pecho','Pecho superior','Tríceps','Barra',2,true,'Banco a 30–45°. Mayor énfasis en el pectoral superior y deltoides anterior.'),
(null,'Press banca inclinado con mancuernas','Incline Dumbbell Press','empuje-h','pecho','Pecho superior','Hombros','Mancuernas',1,true,'Banco inclinado con mancuernas. Mayor ROM y corrección de desequilibrios. Hombros estabilizados.'),
(null,'Press banca declinado','Decline Bench Press','empuje-h','pecho','Pecho inferior','Tríceps','Barra',2,true,'Banco declinado. Énfasis en el pectoral inferior y mayor carga por posición mecánica favorable.'),
(null,'Aperturas con mancuernas planas','Flat DB Fly','empuje-h','pecho','Pecho','Hombros','Mancuernas',2,true,'Brazos casi extendidos. Bajar lateralmente hasta sentir el estiramiento del pectoral. No bajar más allá de la línea de los hombros.'),
(null,'Fondos en paralelas','Dips','empuje-h','pecho','Pecho','Tríceps','Paralelas',2,true,'Inclinarse levemente hacia adelante para enfatizar el pecho. Bajar hasta 90° de codo. Escápulas controladas.'),
(null,'Press en máquina pecho','Chest Press Machine','empuje-h','pecho','Pecho','Tríceps','Máquina',1,true,'Ideal para principiantes o fatiga acumulada. El rango guiado permite enfocarse en la contracción.'),
(null,'Cruce de poleas bajo a alto','Cable Crossover Low-to-High','empuje-h','pecho','Pecho superior',null,'Polea',1,true,'Polea baja, llevar las manos hacia arriba y al centro. Énfasis en pectoral superior.'),
(null,'Cruce de poleas alto a bajo','Cable Crossover High-to-Low','empuje-h','pecho','Pecho inferior',null,'Polea',1,true,'Polea alta, llevar las manos hacia abajo y al centro. Énfasis en pectoral inferior.'),

-- ── EMPUJE VERTICAL (8) ──────────────────────────────────────────────────────
(null,'Press militar con barra','Overhead Barbell Press','empuje-v','hombros','Hombros','Tríceps','Barra',2,true,'De pie o sentado. Desde los hombros, llevar la barra sobre la cabeza. No arquear la espalda lumbar. Core activo.'),
(null,'Press militar con mancuernas','Dumbbell Shoulder Press','empuje-v','hombros','Hombros','Tríceps','Mancuernas',1,true,'Sentado o de pie. Mayor rango de movimiento que con barra. Trabaja la estabilización rotacional.'),
(null,'Press Arnold','Arnold Press','empuje-v','hombros','Hombros','Tríceps','Mancuernas',2,true,'Iniciar con palmas hacia adentro frente a la cara. Rotar mientras se presiona hacia arriba. Mayor activación del deltoides.'),
(null,'Push press con barra','Push Press','empuje-v','hombros','Hombros','Piernas','Barra',2,true,'Impulso inicial con las piernas para generar momentum. Permite cargas mayores que el press estricto.'),
(null,'Elevaciones laterales con mancuernas','Lateral Raises','empuje-v','hombros','Deltoides lateral',null,'Mancuernas',1,true,'Elevar lateralmente hasta la altura de los hombros. Codo ligeramente flexionado. Pulgar ligeramente hacia abajo. Bajar lento.'),
(null,'Elevaciones frontales','Front Raises','empuje-v','hombros','Deltoides anterior',null,'Mancuernas',1,true,'Levantar los brazos al frente hasta la altura de los hombros. No usar impulso. Bajar controlado.'),
(null,'Elevaciones posteriores (pájaros)','Reverse Fly','empuje-v','hombros','Deltoides posterior','Espalda alta','Mancuernas',1,true,'Torso inclinado ~90°. Elevar los brazos lateralmente hasta la altura de los hombros. Trabaja el deltoides posterior.'),
(null,'Press en máquina hombros','Machine Shoulder Press','empuje-v','hombros','Hombros','Tríceps','Máquina',1,true,'Variante guiada. Ideal para principiantes o para incluir en trabajo de aislamiento al final del entrenamiento.'),

-- ── TIRÓN HORIZONTAL (10) ────────────────────────────────────────────────────
(null,'Remo con barra pronado','Barbell Row','tiron-h','espalda','Dorsal','Bíceps','Barra',2,true,'Torso inclinado ~45°, rodillas semiflexionadas. Llevar la barra al ombligo, codos cerca del cuerpo. No redondear la espalda baja.'),
(null,'Remo Pendlay con barra','Pendlay Row','tiron-h','espalda','Dorsal','Bíceps','Barra',2,true,'Torso paralelo al suelo, barra parte del piso cada repetición. Mayor estímulo de potencia y espalda alta.'),
(null,'Remo con mancuerna unilateral','One-Arm Dumbbell Row','tiron-h','espalda','Dorsal','Bíceps','Mancuerna',1,true,'Apoyar una mano y rodilla en el banco. Llevar la mancuerna hacia la cadera. Rotación escapular completa al final.'),
(null,'Remo en máquina pecho apoyado','Chest-Supported Row','tiron-h','espalda','Dorsal','Romboides','Máquina',1,true,'El pecho apoyado elimina la compensación lumbar. Ideal para aislar la espalda media.'),
(null,'Remo en polea sentado','Seated Cable Row','tiron-h','espalda','Dorsal','Bíceps','Polea',1,true,'Llevar los codos atrás apretando los omóplatos. Torso erecto durante todo el movimiento.'),
(null,'Face pull en polea','Face Pull','tiron-h','hombros','Deltoides posterior','Romboides','Polea',1,true,'Polea a la altura de la cara, cuerda separada al final del movimiento. Excelente para salud del hombro.'),
(null,'Remo en T con barra','T-Bar Row','tiron-h','espalda','Dorsal','Bíceps','Barra en landmine',2,true,'El agarre en Y o V permite cargas altas. Énfasis en el dorsal y espalda alta.'),
(null,'Remo invertido en barra','Inverted Row','tiron-h','espalda','Dorsal','Bíceps','Barra fija',1,true,'Cuerpo recto colgado de una barra baja. Tirar el pecho hacia la barra. Variante de regresión para dominadas.'),
(null,'Pull-over con mancuerna','Dumbbell Pullover','tiron-h','espalda','Dorsal','Pecho','Mancuerna + banco',2,true,'Acostado transversal en el banco, bajar la mancuerna detrás de la cabeza. Trabaja tanto el dorsal como el pectoral.'),
(null,'Remo en polea alta con cuerda','Rope Cable Row','tiron-h','espalda','Romboides','Deltoides posterior','Polea',1,true,'Cuerda en polea alta, tirar hacia la cara separando las manos. Excelente para salud escapular.'),

-- ── TIRÓN VERTICAL (8) ───────────────────────────────────────────────────────
(null,'Dominadas pronadas','Pull-Ups','tiron-v','espalda','Dorsal','Bíceps','Barra fija',2,true,'Desde colgado con agarre prono, llevar el pecho a la barra. Codos hacia abajo y atrás. Mayor énfasis en el dorsal.'),
(null,'Chin-ups (dominadas supinas)','Chin-Ups','tiron-v','espalda','Bíceps','Dorsal','Barra fija',2,true,'Agarre supino. Mayor activación del bíceps que las dominadas pronadas. Generalmente más accesible.'),
(null,'Jalón al pecho en polea','Lat Pulldown','tiron-v','espalda','Dorsal','Bíceps','Polea',1,true,'Bajar la barra hasta la parte superior del pecho. Codos hacia abajo y atrás. No balancear el torso hacia atrás.'),
(null,'Jalón agarre neutro en polea','Neutral Grip Lat Pulldown','tiron-v','espalda','Dorsal','Bíceps','Polea',1,true,'Agarre neutro (palmas enfrentadas). Menor tensión en los codos y hombros.'),
(null,'Jalón agarre estrecho','Close-Grip Pulldown','tiron-v','espalda','Dorsal','Bíceps','Polea',1,true,'Manos juntas, agarre pronado o neutro. Énfasis en la parte inferior del dorsal.'),
(null,'Pull-over en polea','Cable Pullover','tiron-v','espalda','Dorsal',null,'Polea',2,true,'De pie o inclinado frente a polea alta, bajar los brazos extendidos. Aislamiento del dorsal.'),
(null,'Dominadas asistidas en máquina','Assisted Pull-Ups','tiron-v','espalda','Dorsal','Bíceps','Máquina asistida',1,true,'La máquina reduce el peso corporal efectivo. Ideal para comenzar a aprender dominadas.'),
(null,'Jalón al pecho en polea unilateral','Single-Arm Pulldown','tiron-v','espalda','Dorsal',null,'Polea',2,true,'Un brazo a la vez. Permite mayor rango de movimiento y corrige desequilibrios.'),

-- ── CORE (11) ────────────────────────────────────────────────────────────────
(null,'Plancha isométrica','Plank','core','core','Core',null,'Peso corporal',1,true,'Apoyado en antebrazos y puntas de pie. Cuerpo recto como tabla. Contraer abdomen y glúteos. No dejar caer las caderas.'),
(null,'Plancha lateral','Side Plank','core','core','Oblicuos',null,'Peso corporal',1,true,'Apoyado en un antebrazo y el borde del pie. Cadera elevada formando una línea recta. Trabaja oblicuos laterales.'),
(null,'Crunch abdominal','Crunch','core','core','Abdomen',null,'Peso corporal',1,true,'Acostado, rodillas flexionadas. Llevar los hombros hacia las rodillas. No jalar el cuello. Espirar al subir.'),
(null,'Crunch en polea','Cable Crunch','core','core','Abdomen',null,'Polea',1,true,'Arrodillado frente a polea alta. Flexión de columna llevando los codos hacia las rodillas. Mayor resistencia progresiva.'),
(null,'Elevación de piernas colgado','Hanging Leg Raise','core','core','Abdomen bajo',null,'Barra fija',2,true,'Colgado de la barra, elevar piernas hasta la horizontal o más. Trabaja el recto abdominal inferior.'),
(null,'Rueda abdominal','Ab Wheel Rollout','core','core','Core',null,'Rueda abdominal',2,true,'Desde rodillas, extender la rueda hasta casi tocar el suelo. Volver usando el abdomen, no los hombros.'),
(null,'Russian twist','Russian Twist','core','core','Oblicuos',null,'Mancuerna o disco',1,true,'Sentado con torso inclinado y pies elevados. Girar el torso de lado a lado tocando el suelo con las manos.'),
(null,'Dead bug','Dead Bug','core','core','Core',null,'Peso corporal',1,true,'Acostado, extender el brazo y la pierna opuesta simultáneamente manteniendo la zona lumbar pegada al suelo.'),
(null,'Pallof press','Pallof Press','core','core','Core','Oblicuos','Polea',2,true,'De lado a la polea, extender los brazos al frente resistiendo la rotación. Estabilidad antirotacional del core.'),
(null,'Hollow body hold','Hollow Body Hold','core','core','Core',null,'Peso corporal',2,true,'Acostado, comprimir zona lumbar al suelo. Extender brazos y piernas formando una banana invertida.'),
(null,'Dragon flag','Dragon Flag','core','core','Core',null,'Banco',3,true,'Acostado en banco, apoyarse en los hombros. Elevar y bajar el cuerpo completamente recto. Core avanzado.'),

-- ── POTENCIA / PLIOMÉTRICO (7) ───────────────────────────────────────────────
(null,'Box jump','Box Jump','potencia','piernas','Cuádriceps','Glúteos','Cajón pliométrico',2,true,'Saltar al cajón desde posición de cuclillas parcial. Aterrizar suavemente con rodillas ligeramente flexionadas.'),
(null,'Broad jump','Broad Jump','potencia','piernas','Cuádriceps','Glúteos','Peso corporal',2,true,'Salto horizontal. Impulso con brazos y piernas, aterrizaje controlado con amortiguación completa.'),
(null,'Medicine ball slam','Med Ball Slam','potencia','core','Core','Hombros','Pelota medicinal',1,true,'Elevar la pelota sobre la cabeza y arrojarla con fuerza al suelo. Movimiento explosivo de cuerpo completo.'),
(null,'Hang power clean','Hang Power Clean','potencia','piernas','Full body',null,'Barra',3,true,'Desde posición de descanso en muslos, triple extensión explosiva para atrapar la barra en rack frontal.'),
(null,'Thruster con barra','Barbell Thruster','potencia','piernas','Full body',null,'Barra',3,true,'Combina sentadilla frontal con press militar en un movimiento fluido. Muy demandante metabólicamente.'),
(null,'Salto en profundidad','Depth Jump','potencia','piernas','Cuádriceps','Glúteos','Cajón',3,true,'Bajar del cajón y saltar inmediatamente. Minimizar el tiempo de contacto en el suelo. Pliometría avanzada.'),
(null,'Lanzamiento de balón medicinal a pared','Medicine Ball Wall Throw','potencia','pecho','Pecho','Hombros','Pelota medicinal',1,true,'Lanzar explosivamente la pelota contra la pared y atraparla. Potencia de tren superior.'),

-- ── FUNCIONAL / CARDIO (15) ──────────────────────────────────────────────────
(null,'Curl de bíceps con barra','Barbell Bicep Curl','funcional','biceps','Bíceps',null,'Barra',1,true,'Codos fijos a los lados del torso. Llevar la barra hasta los hombros. No balancear el cuerpo. Bajar de forma controlada.'),
(null,'Curl de bíceps con mancuernas alternado','Alternating Dumbbell Curl','funcional','biceps','Bíceps',null,'Mancuernas',1,true,'Alternar cada brazo. Girar la muñeca (supinación) a medida que sube. Codo fijo en el costado.'),
(null,'Curl de bíceps en polea','Cable Bicep Curl','funcional','biceps','Bíceps',null,'Polea',1,true,'Tensión constante a lo largo de todo el rango de movimiento. Codos fijos a los lados.'),
(null,'Press francés con barra EZ','EZ Bar Skull Crusher','funcional','triceps','Tríceps',null,'Barra EZ',2,true,'Acostado. Bajar la barra hasta la frente, codos apuntando al techo. Extiende completamente. Trabaja el tríceps largo.'),
(null,'Extensión de tríceps en polea','Tricep Pushdown','funcional','triceps','Tríceps',null,'Polea',1,true,'Con cuerda o barra. Codos fijos a los lados, extender hacia abajo hasta bloquear. Separar la cuerda al final.'),
(null,'Extensión de tríceps sobre cabeza','Overhead Tricep Extension','funcional','triceps','Tríceps',null,'Mancuerna',1,true,'Con mancuerna sobre la cabeza, bajar doblando los codos. Trabaja especialmente el tríceps largo.'),
(null,'Fondos en banco (tríceps)','Bench Dips','funcional','triceps','Tríceps',null,'Banco',1,true,'Manos apoyadas en banco detrás. Bajar flexionando los codos. Se puede progresar con peso sobre los muslos.'),
(null,'Elevación de pantorrillas de pie','Standing Calf Raise','funcional','piernas','Pantorrillas',null,'Máquina o barra',1,true,'Subir en punta de pies y bajar controlado. Trabajo de gastrocnemio con rodilla extendida.'),
(null,'Elevación de pantorrillas sentado','Seated Calf Raise','funcional','piernas','Sóleo',null,'Máquina',1,true,'Con rodillas flexionadas el gastrocnemio está relajado, aislando el sóleo. Complementario al calf raise de pie.'),
(null,'Caminata inclinada en cinta','Incline Treadmill Walk','funcional','cardio','Cardio',null,'Cinta',1,true,'Inclinación 5–10%, velocidad 5–7 km/h. Postura erguida, brazos en movimiento natural. Excelente LISS.'),
(null,'Bicicleta estática','Stationary Bike','funcional','cardio','Cardio',null,'Bicicleta',1,true,'Resistencia moderada, cadencia de 70–90 rpm. Ideal como calentamiento, vuelta a la calma o recuperación activa.'),
(null,'Remo en máquina','Rowing Machine','funcional','cardio','Cardio','Espalda','Máquina de remos',2,true,'Empuje con las piernas primero, luego tracción de brazos. Postura erguida al final del tirón.'),
(null,'Saltar la cuerda','Jump Rope','funcional','cardio','Cardio','Pantorrillas','Soga',1,true,'Cadencia uniforme, muñecas hacen el movimiento. Excelente para calentamiento y acondicionamiento cardiovascular.'),
(null,'Burpee','Burpee','funcional','piernas','Full body',null,'Peso corporal',2,true,'Secuencia: posición de plancha → flexión → salto vertical con palmada. Acondicionamiento total.'),
(null,'Escalador (mountain climber)','Mountain Climber','funcional','core','Core','Hombros','Peso corporal',1,true,'En posición de plancha, alternar rodillas hacia el pecho rápidamente. Cardio y core simultáneamente.');
