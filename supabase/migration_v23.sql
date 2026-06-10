-- migration_v23: add category/subcategory + re-insert global exercises

-- 1. Add new columns
ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS category    text,
  ADD COLUMN IF NOT EXISTS subcategory text;

-- 2. Wipe all global exercises (clean re-insert)
DELETE FROM public.exercise_library WHERE is_global = true;

-- 3. Re-insert 111 global exercises with category + subcategory
INSERT INTO public.exercise_library
  (trainer_id, name, name_en, category, subcategory, pattern,
   muscle_group, muscle_primary, muscle_secondary, equipment, level, is_global, description)
VALUES

-- ── TREN INFERIOR › RODILLA DOMINANTE (10) ──────────────────────────────────
(null,'Sentadilla con barra trasera','Back Squat','inf','rodilla','rodilla','piernas','Cuádriceps','Glúteos','Barra',2,true,'Pies al ancho de hombros, barra sobre los trapecios. Bajar hasta muslos paralelos o más.'),
(null,'Sentadilla frontal con barra','Front Squat','inf','rodilla','rodilla','piernas','Cuádriceps','Core','Barra',3,true,'Barra sobre deltoides anteriores. Mayor exigencia de movilidad de tobillo. Core muy activo.'),
(null,'Sentadilla goblet con mancuerna','Goblet Squat','inf','rodilla','rodilla','piernas','Cuádriceps','Glúteos','Mancuerna',1,true,'Sostener la mancuerna verticalmente frente al pecho. Excelente para aprender la mecánica.'),
(null,'Prensa de piernas','Leg Press','inf','rodilla','rodilla','piernas','Cuádriceps','Glúteos','Máquina',1,true,'Pies al ancho de hombros. Bajar hasta 90° de rodilla. No despegar lumbares del respaldo.'),
(null,'Extensión de cuádriceps en máquina','Leg Extension','inf','rodilla','rodilla','piernas','Cuádriceps',null,'Máquina',1,true,'Extender completamente y bajar con control en 2–3 segundos. Aislamiento de cuádriceps.'),
(null,'Hack squat en máquina','Hack Squat','inf','rodilla','rodilla','piernas','Cuádriceps','Glúteos','Máquina',2,true,'Hombros bajo los apoyos. Bajar profundo controlando las rodillas.'),
(null,'Sentadilla sumo con barra','Sumo Squat','inf','rodilla','rodilla','piernas','Cuádriceps','Aductores','Barra',2,true,'Pies muy abiertos con puntas hacia afuera. Mayor activación de aductores y glúteos internos.'),
(null,'Sentadilla en Smith','Smith Machine Squat','inf','rodilla','rodilla','piernas','Cuádriceps','Glúteos','Máquina Smith',1,true,'La barra guiada reduce la exigencia de estabilización. Útil para aprendizaje o rehabilitación.'),
(null,'Sentadilla a cajón','Box Squat','inf','rodilla','rodilla','piernas','Cuádriceps','Glúteos','Barra + cajón',2,true,'Sentarse brevemente en el cajón y volver. Entrena la fase excéntrica y elimina el rebote.'),
(null,'Leg press unilateral','Single-Leg Press','inf','rodilla','rodilla','piernas','Cuádriceps','Glúteos','Máquina',2,true,'Con un solo pie en la plataforma. Identifica y corrige desequilibrios entre piernas.'),

-- ── TREN INFERIOR › CADERA DOMINANTE (10) ───────────────────────────────────
(null,'Peso muerto convencional','Conventional Deadlift','inf','cadera','cadera','gluteos','Isquiotibiales','Espalda baja','Barra',2,true,'Agarre al ancho de caderas, espalda neutra. No redondear lumbar.'),
(null,'Peso muerto rumano','Romanian Deadlift','inf','cadera','cadera','gluteos','Isquiotibiales','Glúteos','Barra',2,true,'Rodillas casi extendidas. Bajar inclinando el torso hasta sentir estiramiento de isquios.'),
(null,'Peso muerto sumo','Sumo Deadlift','inf','cadera','cadera','gluteos','Isquiotibiales','Aductores','Barra',2,true,'Postura muy abierta, puntas hacia afuera. Menor recorrido lumbar que el convencional.'),
(null,'Hip thrust con barra','Hip Thrust','inf','cadera','cadera','gluteos','Glúteos','Isquiotibiales','Barra + banco',1,true,'Hombros apoyados en banco, barra sobre las caderas. Contraer glúteos arriba.'),
(null,'Puente de glúteos en suelo','Glute Bridge','inf','cadera','cadera','gluteos','Glúteos','Isquiotibiales','Peso corporal',1,true,'Acostado, pies plantados. Empujar las caderas hacia arriba. Se puede progresar con disco.'),
(null,'Curl femoral acostado en máquina','Lying Leg Curl','inf','cadera','cadera','piernas','Isquiotibiales',null,'Máquina',1,true,'Flexionar hasta aproximarse al glúteo. Mantener la cadera pegada al banco.'),
(null,'Curl femoral sentado en máquina','Seated Leg Curl','inf','cadera','cadera','piernas','Isquiotibiales',null,'Máquina',1,true,'Mayor estiramiento inicial. Activación adicional del bíceps femoral largo.'),
(null,'Good morning con barra','Good Morning','inf','cadera','cadera','piernas','Isquiotibiales','Espalda baja','Barra',3,true,'Barra sobre trapecios, rodillas semiflexionadas. Inclinar torso manteniendo espalda recta.'),
(null,'Kettlebell swing','Kettlebell Swing','inf','cadera','cadera','gluteos','Glúteos','Isquiotibiales','Kettlebell',2,true,'El movimiento es una bisagra de cadera explosiva, no una sentadilla.'),
(null,'Cable pull-through','Cable Pull-Through','inf','cadera','cadera','gluteos','Glúteos','Isquiotibiales','Polea',2,true,'De espaldas a la polea baja, tomar la cuerda entre las piernas. Bisagra de cadera completa.'),

-- ── TREN INFERIOR › UNILATERAL (6) ──────────────────────────────────────────
(null,'Zancadas con mancuernas','Walking Lunges','inf','unilateral','unilateral','piernas','Cuádriceps','Glúteos','Mancuernas',1,true,'Un pie adelante, bajar la rodilla trasera cerca del suelo. Empujar con el talón delantero.'),
(null,'Zancada inversa','Reverse Lunge','inf','unilateral','unilateral','piernas','Cuádriceps','Glúteos','Mancuernas',1,true,'Dar un paso hacia atrás bajando la rodilla. Más segura para rodillas que la zancada frontal.'),
(null,'Step-up con mancuernas','Step-Up','inf','unilateral','unilateral','piernas','Cuádriceps','Glúteos','Mancuernas + banco',1,true,'Subir al banco empujando con el talón. Evitar empujar con el pie trasero.'),
(null,'Sentadilla búlgara','Bulgarian Split Squat','inf','unilateral','unilateral','piernas','Cuádriceps','Glúteos','Mancuernas + banco',2,true,'Pie trasero elevado en banco. Gran activador de glúteos y cuádriceps.'),
(null,'Peso muerto a una pierna','Single-Leg RDL','inf','unilateral','unilateral','gluteos','Isquiotibiales','Glúteos','Mancuerna',3,true,'Gran exigencia de equilibrio. Bajar la mancuerna manteniéndola cerca del cuerpo.'),
(null,'Hip thrust unilateral','Single-Leg Hip Thrust','inf','unilateral','unilateral','gluteos','Glúteos','Isquiotibiales','Banco',2,true,'Una pierna elevada, la otra extiende la cadera. Identifica asimetrías entre lados.'),

-- ── TREN SUPERIOR › EMPUJE HORIZONTAL (10) ──────────────────────────────────
(null,'Press banca con barra','Barbell Bench Press','sup','empuje-h','empuje-h','pecho','Pecho','Tríceps','Barra',2,true,'Bajar la barra al pecho a la altura de los pezones. Codos a 45°. Empujar explosivamente.'),
(null,'Press banca con mancuernas','Dumbbell Bench Press','sup','empuje-h','empuje-h','pecho','Pecho','Tríceps','Mancuernas',1,true,'Mayor rango de movimiento que con barra. Al bajar, codos ligeramente por debajo del banco.'),
(null,'Press banca inclinado con barra','Incline Barbell Bench Press','sup','empuje-h','empuje-h','pecho','Pecho superior','Tríceps','Barra',2,true,'Banco a 30–45°. Mayor énfasis en el pectoral superior y deltoides anterior.'),
(null,'Press banca inclinado con mancuernas','Incline Dumbbell Press','sup','empuje-h','empuje-h','pecho','Pecho superior','Hombros','Mancuernas',1,true,'Mayor ROM y corrección de desequilibrios. Hombros estabilizados.'),
(null,'Press banca declinado','Decline Bench Press','sup','empuje-h','empuje-h','pecho','Pecho inferior','Tríceps','Barra',2,true,'Banco declinado. Énfasis en el pectoral inferior.'),
(null,'Aperturas con mancuernas planas','Flat DB Fly','sup','empuje-h','empuje-h','pecho','Pecho','Hombros','Mancuernas',2,true,'Brazos casi extendidos. No bajar más allá de la línea de los hombros.'),
(null,'Fondos en paralelas','Dips','sup','empuje-h','empuje-h','pecho','Pecho','Tríceps','Paralelas',2,true,'Inclinarse hacia adelante para enfatizar el pecho. Bajar hasta 90° de codo.'),
(null,'Press en máquina pecho','Chest Press Machine','sup','empuje-h','empuje-h','pecho','Pecho','Tríceps','Máquina',1,true,'Rango guiado. Ideal para principiantes o fatiga acumulada.'),
(null,'Cruce de poleas bajo a alto','Cable Crossover Low-to-High','sup','empuje-h','empuje-h','pecho','Pecho superior',null,'Polea',1,true,'Polea baja, llevar las manos hacia arriba y al centro.'),
(null,'Cruce de poleas alto a bajo','Cable Crossover High-to-Low','sup','empuje-h','empuje-h','pecho','Pecho inferior',null,'Polea',1,true,'Polea alta, llevar las manos hacia abajo y al centro.'),

-- ── TREN SUPERIOR › EMPUJE VERTICAL (8) ─────────────────────────────────────
(null,'Press militar con barra','Overhead Barbell Press','sup','empuje-v','empuje-v','hombros','Hombros','Tríceps','Barra',2,true,'De pie o sentado. Llevar la barra sobre la cabeza. No arquear lumbar.'),
(null,'Press militar con mancuernas','Dumbbell Shoulder Press','sup','empuje-v','empuje-v','hombros','Hombros','Tríceps','Mancuernas',1,true,'Sentado o de pie. Mayor rango de movimiento que con barra.'),
(null,'Press Arnold','Arnold Press','sup','empuje-v','empuje-v','hombros','Hombros','Tríceps','Mancuernas',2,true,'Iniciar con palmas hacia adentro. Rotar mientras se presiona. Mayor activación del deltoides.'),
(null,'Push press con barra','Push Press','sup','empuje-v','empuje-v','hombros','Hombros','Piernas','Barra',2,true,'Impulso inicial con las piernas. Permite cargas mayores que el press estricto.'),
(null,'Elevaciones laterales con mancuernas','Lateral Raises','sup','empuje-v','empuje-v','hombros','Deltoides lateral',null,'Mancuernas',1,true,'Elevar lateralmente hasta la altura de los hombros. Bajar lento.'),
(null,'Elevaciones frontales','Front Raises','sup','empuje-v','empuje-v','hombros','Deltoides anterior',null,'Mancuernas',1,true,'Levantar los brazos al frente hasta la altura de los hombros. No usar impulso.'),
(null,'Elevaciones posteriores (pájaros)','Reverse Fly','sup','empuje-v','empuje-v','hombros','Deltoides posterior','Espalda alta','Mancuernas',1,true,'Torso inclinado ~90°. Elevar los brazos lateralmente hasta hombros.'),
(null,'Press en máquina hombros','Machine Shoulder Press','sup','empuje-v','empuje-v','hombros','Hombros','Tríceps','Máquina',1,true,'Variante guiada. Ideal para principiantes o aislamiento al final del entrenamiento.'),

-- ── TREN SUPERIOR › TIRÓN HORIZONTAL (10) ───────────────────────────────────
(null,'Remo con barra pronado','Barbell Row','sup','tiron-h','tiron-h','espalda','Dorsal','Bíceps','Barra',2,true,'Torso inclinado ~45°. Llevar la barra al ombligo. No redondear la espalda baja.'),
(null,'Remo Pendlay con barra','Pendlay Row','sup','tiron-h','tiron-h','espalda','Dorsal','Bíceps','Barra',2,true,'Torso paralelo al suelo, barra parte del piso cada rep. Mayor estímulo de potencia.'),
(null,'Remo con mancuerna unilateral','One-Arm Dumbbell Row','sup','tiron-h','tiron-h','espalda','Dorsal','Bíceps','Mancuerna',1,true,'Apoyar una mano y rodilla en el banco. Rotación escapular completa al final.'),
(null,'Remo en máquina pecho apoyado','Chest-Supported Row','sup','tiron-h','tiron-h','espalda','Dorsal','Romboides','Máquina',1,true,'El pecho apoyado elimina la compensación lumbar. Ideal para aislar espalda media.'),
(null,'Remo en polea sentado','Seated Cable Row','sup','tiron-h','tiron-h','espalda','Dorsal','Bíceps','Polea',1,true,'Llevar los codos atrás apretando los omóplatos. Torso erecto todo el movimiento.'),
(null,'Face pull en polea','Face Pull','sup','tiron-h','tiron-h','hombros','Deltoides posterior','Romboides','Polea',1,true,'Polea a altura de la cara, cuerda separada al final. Excelente para salud del hombro.'),
(null,'Remo en T con barra','T-Bar Row','sup','tiron-h','tiron-h','espalda','Dorsal','Bíceps','Barra en landmine',2,true,'El agarre en Y o V permite cargas altas. Énfasis en dorsal y espalda alta.'),
(null,'Remo invertido en barra','Inverted Row','sup','tiron-h','tiron-h','espalda','Dorsal','Bíceps','Barra fija',1,true,'Cuerpo recto colgado de una barra baja. Variante de regresión para dominadas.'),
(null,'Pull-over con mancuerna','Dumbbell Pullover','sup','tiron-h','tiron-h','espalda','Dorsal','Pecho','Mancuerna + banco',2,true,'Acostado transversal en el banco. Trabaja tanto el dorsal como el pectoral.'),
(null,'Remo en polea alta con cuerda','Rope Cable Row','sup','tiron-h','tiron-h','espalda','Romboides','Deltoides posterior','Polea',1,true,'Cuerda en polea alta, tirar hacia la cara separando las manos.'),

-- ── TREN SUPERIOR › TIRÓN VERTICAL (8) ──────────────────────────────────────
(null,'Dominadas pronadas','Pull-Ups','sup','tiron-v','tiron-v','espalda','Dorsal','Bíceps','Barra fija',2,true,'Desde colgado con agarre prono, llevar el pecho a la barra. Codos hacia abajo y atrás.'),
(null,'Chin-ups (dominadas supinas)','Chin-Ups','sup','tiron-v','tiron-v','espalda','Bíceps','Dorsal','Barra fija',2,true,'Agarre supino. Mayor activación del bíceps. Generalmente más accesible.'),
(null,'Jalón al pecho en polea','Lat Pulldown','sup','tiron-v','tiron-v','espalda','Dorsal','Bíceps','Polea',1,true,'Bajar la barra hasta la parte superior del pecho. Codos hacia abajo y atrás.'),
(null,'Jalón agarre neutro en polea','Neutral Grip Lat Pulldown','sup','tiron-v','tiron-v','espalda','Dorsal','Bíceps','Polea',1,true,'Agarre neutro (palmas enfrentadas). Menor tensión en los codos y hombros.'),
(null,'Jalón agarre estrecho','Close-Grip Pulldown','sup','tiron-v','tiron-v','espalda','Dorsal','Bíceps','Polea',1,true,'Manos juntas. Énfasis en la parte inferior del dorsal.'),
(null,'Pull-over en polea','Cable Pullover','sup','tiron-v','tiron-v','espalda','Dorsal',null,'Polea',2,true,'De pie o inclinado frente a polea alta, bajar los brazos extendidos. Aislamiento del dorsal.'),
(null,'Dominadas asistidas en máquina','Assisted Pull-Ups','sup','tiron-v','tiron-v','espalda','Dorsal','Bíceps','Máquina asistida',1,true,'La máquina reduce el peso corporal efectivo. Ideal para aprender dominadas.'),
(null,'Jalón al pecho unilateral','Single-Arm Pulldown','sup','tiron-v','tiron-v','espalda','Dorsal',null,'Polea',2,true,'Un brazo a la vez. Mayor rango de movimiento y corrección de desequilibrios.'),

-- ── CORE › ANTIEXTENSIÓN (4) ─────────────────────────────────────────────────
(null,'Plancha isométrica','Plank','core','antiextension','core','core','Core',null,'Peso corporal',1,true,'Apoyado en antebrazos y puntas de pie. Cuerpo recto. Contraer abdomen y glúteos.'),
(null,'Rueda abdominal','Ab Wheel Rollout','core','antiextension','core','core','Core',null,'Rueda abdominal',2,true,'Desde rodillas, extender la rueda hasta casi tocar el suelo. Volver usando el abdomen.'),
(null,'Dead bug','Dead Bug','core','antiextension','core','core','Core',null,'Peso corporal',1,true,'Extender el brazo y pierna opuesta simultáneamente. Zona lumbar pegada al suelo.'),
(null,'Hollow body hold','Hollow Body Hold','core','antiextension','core','core','Core',null,'Peso corporal',2,true,'Comprimir zona lumbar al suelo. Extender brazos y piernas formando banana invertida.'),

-- ── CORE › ANTIRROTACIÓN (2) ─────────────────────────────────────────────────
(null,'Plancha lateral','Side Plank','core','antirotacion','core','core','Oblicuos',null,'Peso corporal',1,true,'Apoyado en un antebrazo y el borde del pie. Cadera elevada formando línea recta.'),
(null,'Pallof press','Pallof Press','core','antirotacion','core','core','Core','Oblicuos','Polea',2,true,'De lado a la polea, extender los brazos resistiendo la rotación. Estabilidad antirotacional.'),

-- ── CORE › FLEXIÓN LUMBAR (4) ────────────────────────────────────────────────
(null,'Crunch abdominal','Crunch','core','flexion-lumbar','core','core','Abdomen',null,'Peso corporal',1,true,'Llevar los hombros hacia las rodillas. No jalar el cuello. Espirar al subir.'),
(null,'Crunch en polea','Cable Crunch','core','flexion-lumbar','core','core','Abdomen',null,'Polea',1,true,'Arrodillado frente a polea alta. Flexión de columna llevando codos hacia rodillas.'),
(null,'Elevación de piernas colgado','Hanging Leg Raise','core','flexion-lumbar','core','core','Abdomen bajo',null,'Barra fija',2,true,'Colgado de la barra, elevar piernas hasta la horizontal o más.'),
(null,'Dragon flag','Dragon Flag','core','flexion-lumbar','core','core','Core',null,'Banco',3,true,'Acostado en banco, apoyarse en los hombros. Elevar y bajar el cuerpo completamente recto.'),

-- ── CORE › ROTACIÓN (1) ──────────────────────────────────────────────────────
(null,'Russian twist','Russian Twist','core','rotacion','core','core','Oblicuos',null,'Mancuerna o disco',1,true,'Sentado con torso inclinado y pies elevados. Girar el torso de lado a lado.'),

-- ── POTENCIA › SALTOS (3) ────────────────────────────────────────────────────
(null,'Box jump','Box Jump','pot','saltos','potencia','piernas','Cuádriceps','Glúteos','Cajón pliométrico',2,true,'Saltar al cajón desde posición de cuclillas parcial. Aterrizar suavemente.'),
(null,'Broad jump','Broad Jump','pot','saltos','potencia','piernas','Cuádriceps','Glúteos','Peso corporal',2,true,'Salto horizontal. Impulso con brazos y piernas, aterrizaje controlado.'),
(null,'Salto en profundidad','Depth Jump','pot','saltos','potencia','piernas','Cuádriceps','Glúteos','Cajón',3,true,'Bajar del cajón y saltar inmediatamente. Minimizar tiempo de contacto. Pliometría avanzada.'),

-- ── POTENCIA › LANZAMIENTOS (2) ──────────────────────────────────────────────
(null,'Medicine ball slam','Med Ball Slam','pot','lanzamientos','potencia','core','Core','Hombros','Pelota medicinal',1,true,'Elevar la pelota sobre la cabeza y arrojarla con fuerza al suelo. Movimiento explosivo.'),
(null,'Lanzamiento de balón medicinal a pared','Medicine Ball Wall Throw','pot','lanzamientos','potencia','pecho','Pecho','Hombros','Pelota medicinal',1,true,'Lanzar explosivamente la pelota contra la pared y atraparla.'),

-- ── POTENCIA › BALÍSTICOS (2) ────────────────────────────────────────────────
(null,'Hang power clean','Hang Power Clean','pot','balisticos','potencia','piernas','Full body',null,'Barra',3,true,'Desde posición de descanso en muslos, triple extensión explosiva para atrapar la barra.'),
(null,'Thruster con barra','Barbell Thruster','pot','balisticos','potencia','piernas','Full body',null,'Barra',3,true,'Combina sentadilla frontal con press militar en un movimiento fluido. Muy demandante.'),

-- ── MOVILIDAD › MOVILIDAD DE CADERA (3) ─────────────────────────────────────
(null,'Estiramiento 90-90 de cadera','90-90 Hip Stretch','mov','movilidad-cadera','funcional','gluteos','Cadera','Glúteos','Peso corporal',1,true,'Sentado en el suelo, ambas piernas en ángulo de 90°. Inclinarse hacia la pierna delantera.'),
(null,'Círculos de cadera en cuadrupedia','Hip CARs','mov','movilidad-cadera','funcional','gluteos','Cadera',null,'Peso corporal',1,true,'En cuadrupedia, hacer círculos amplios con la rodilla. Trabaja el rango articular completo.'),
(null,'Apertura lateral de cadera (Cossack)','Cossack Squat','mov','movilidad-cadera','funcional','piernas','Cadera','Aductores','Peso corporal',2,true,'Desplazarse lateralmente a una pierna mientras la otra permanece extendida. Movilidad profunda.'),

-- ── MOVILIDAD › MOVILIDAD TORÁCICA (2) ──────────────────────────────────────
(null,'Rotación torácica en cuadrupedia','Thoracic Rotation','mov','movilidad-toracica','funcional','espalda','Columna torácica',null,'Peso corporal',1,true,'En cuadrupedia, llevar un codo hacia arriba rotando la columna torácica. Suave y controlado.'),
(null,'World greatest stretch','World''s Greatest Stretch','mov','movilidad-toracica','funcional','piernas','Full body',null,'Peso corporal',2,true,'Zancada profunda con rotación de torso y apertura de cadera. Movilidad total.'),

-- ── MOVILIDAD › ELONGACIÓN ISQUIOTIBIALES (2) ───────────────────────────────
(null,'Estiramiento de isquiotibiales acostado','Supine Hamstring Stretch','mov','elongacion-isquiotibiales','funcional','piernas','Isquiotibiales',null,'Peso corporal',1,true,'Acostado, llevar la pierna hacia el pecho con rodilla extendida. Sostener 30-45 segundos.'),
(null,'Estiramiento de isquiotibiales de pie','Standing Hamstring Stretch','mov','elongacion-isquiotibiales','funcional','piernas','Isquiotibiales',null,'Peso corporal',1,true,'De pie, apoyar el talón en una superficie y flexionar levemente el torso hacia adelante.'),

-- ── MOVILIDAD › MOVILIDAD DE HOMBROS (2) ────────────────────────────────────
(null,'Estiramiento de hombro cruzado','Cross-Body Shoulder Stretch','mov','movilidad-hombros','funcional','hombros','Hombros',null,'Peso corporal',1,true,'Llevar el brazo extendido horizontalmente frente al cuerpo. Sostener con el otro brazo.'),
(null,'Rotación interna de hombro con banda','Band Internal Rotation','mov','movilidad-hombros','funcional','hombros','Hombros','Manguito rotador','Banda elástica',1,true,'Codo a 90°, rotar el antebrazo hacia el cuerpo contra la resistencia de la banda.'),

-- ── CALENTAMIENTO › ACTIVACIÓN DE GLÚTEOS (2) ───────────────────────────────
(null,'Fire hydrant con banda','Fire Hydrant','calent','activacion-gluteos','funcional','gluteos','Glúteos','Abductores','Banda elástica',1,true,'En cuadrupedia, elevar la rodilla lateralmente como abrir una puerta. Contraer el glúteo.'),
(null,'Clamshell con banda','Clamshell','calent','activacion-gluteos','funcional','gluteos','Glúteos','Abductores','Banda elástica',1,true,'Acostado de lado, rodillas flexionadas. Abrir la rodilla superior como una almeja.'),

-- ── CALENTAMIENTO › ACTIVACIÓN DE CORE (2) ──────────────────────────────────
(null,'Pájaro perro','Bird Dog','calent','activacion-core','core','core','Core',null,'Peso corporal',1,true,'En cuadrupedia, extender brazo y pierna opuesta simultáneamente. Lento y controlado.'),
(null,'Vacío abdominal','Abdominal Hollowing','calent','activacion-core','core','core','Core',null,'Peso corporal',1,true,'Contraer el transverso abdominal metiendo el ombligo. Mantener 5-10 segundos con respiración.'),

-- ── CALENTAMIENTO › ACTIVACIÓN ESCAPULAR (2) ────────────────────────────────
(null,'Y-T-W en banco inclinado','Y-T-W on Incline Bench','calent','activacion-escapular','tiron-h','espalda','Trapecio','Romboides','Banco inclinado',1,true,'Boca abajo en banco inclinado. Formar Y, T y W con los brazos. Activa toda la musculatura escapular.'),
(null,'Retracción escapular con banda','Band Scapular Retraction','calent','activacion-escapular','tiron-h','espalda','Romboides','Trapecio medio','Banda elástica',1,true,'Tirar la banda hacia el pecho apretando los omóplatos. Codos cerca del cuerpo.'),

-- ── FUNCIONAL › FUNCIONAL (11) ───────────────────────────────────────────────
(null,'Curl de bíceps con barra','Barbell Bicep Curl','func','funcional','funcional','biceps','Bíceps',null,'Barra',1,true,'Codos fijos a los lados. Llevar la barra hasta los hombros. No balancear el cuerpo.'),
(null,'Curl de bíceps con mancuernas alternado','Alternating Dumbbell Curl','func','funcional','funcional','biceps','Bíceps',null,'Mancuernas',1,true,'Alternar cada brazo. Girar la muñeca (supinación) a medida que sube.'),
(null,'Curl de bíceps en polea','Cable Bicep Curl','func','funcional','funcional','biceps','Bíceps',null,'Polea',1,true,'Tensión constante a lo largo de todo el rango de movimiento.'),
(null,'Press francés con barra EZ','EZ Bar Skull Crusher','func','funcional','funcional','triceps','Tríceps',null,'Barra EZ',2,true,'Acostado. Bajar la barra hasta la frente. Trabaja el tríceps largo.'),
(null,'Extensión de tríceps en polea','Tricep Pushdown','func','funcional','funcional','triceps','Tríceps',null,'Polea',1,true,'Con cuerda o barra. Codos fijos, extender hacia abajo hasta bloquear.'),
(null,'Extensión de tríceps sobre cabeza','Overhead Tricep Extension','func','funcional','funcional','triceps','Tríceps',null,'Mancuerna',1,true,'Con mancuerna sobre la cabeza, bajar doblando los codos. Trabaja el tríceps largo.'),
(null,'Fondos en banco (tríceps)','Bench Dips','func','funcional','funcional','triceps','Tríceps',null,'Banco',1,true,'Manos apoyadas en banco detrás. Bajar flexionando los codos.'),
(null,'Elevación de pantorrillas de pie','Standing Calf Raise','func','funcional','funcional','piernas','Pantorrillas',null,'Máquina o barra',1,true,'Subir en punta de pies y bajar controlado. Trabaja el gastrocnemio.'),
(null,'Elevación de pantorrillas sentado','Seated Calf Raise','func','funcional','funcional','piernas','Sóleo',null,'Máquina',1,true,'Con rodillas flexionadas aísla el sóleo. Complementario al calf raise de pie.'),
(null,'Burpee','Burpee','func','funcional','funcional','piernas','Full body',null,'Peso corporal',2,true,'Plancha → flexión → salto vertical con palmada. Acondicionamiento total.'),
(null,'Escalador (mountain climber)','Mountain Climber','func','funcional','funcional','core','Core','Hombros','Peso corporal',1,true,'En posición de plancha, alternar rodillas hacia el pecho rápidamente.'),

-- ── FUNCIONAL › CARDIO (4) ───────────────────────────────────────────────────
(null,'Caminata inclinada en cinta','Incline Treadmill Walk','func','cardio','funcional','cardio','Cardio',null,'Cinta',1,true,'Inclinación 5–10%, velocidad 5–7 km/h. Postura erguida. Excelente LISS.'),
(null,'Bicicleta estática','Stationary Bike','func','cardio','funcional','cardio','Cardio',null,'Bicicleta',1,true,'Resistencia moderada, cadencia 70–90 rpm. Ideal para calentamiento o recuperación activa.'),
(null,'Remo en máquina (cardio)','Rowing Machine','func','cardio','funcional','cardio','Cardio','Espalda','Máquina de remos',2,true,'Empuje con las piernas primero, luego tracción de brazos. Postura erguida al final.'),
(null,'Saltar la cuerda','Jump Rope','func','cardio','funcional','cardio','Cardio','Pantorrillas','Soga',1,true,'Cadencia uniforme, muñecas hacen el movimiento. Excelente para calentamiento.');
