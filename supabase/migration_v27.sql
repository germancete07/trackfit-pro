-- migration_v27: subcategorías Monoarticular de empuje/tirón en Tren superior
-- 1. Mover ejercicios monoarticulares existentes a las nuevas subcategorías
-- 2. Insertar nuevos ejercicios monoarticulares

-- ── MOVER: empuje-h → mono-empuje (aislamiento de pecho/polea) ───────────────

UPDATE public.exercise_library
SET subcategory = 'mono-empuje', pattern = 'mono-empuje'
WHERE is_global = true AND category = 'sup' AND subcategory = 'empuje-h'
  AND name IN (
    'Aperturas con mancuernas planas',
    'Cruce de poleas bajo a alto',
    'Cruce de poleas alto a bajo',
    'Press en máquina pecho'
  );

-- ── MOVER: empuje-v → mono-empuje (elevaciones de hombro) ───────────────────

UPDATE public.exercise_library
SET subcategory = 'mono-empuje', pattern = 'mono-empuje'
WHERE is_global = true AND category = 'sup' AND subcategory = 'empuje-v'
  AND name IN (
    'Elevaciones laterales con mancuernas',
    'Elevaciones frontales'
  );

-- ── MOVER: tiron-h → mono-tiron (aislamiento posterior/pullover) ─────────────

UPDATE public.exercise_library
SET subcategory = 'mono-tiron', pattern = 'mono-tiron'
WHERE is_global = true AND category = 'sup' AND subcategory = 'tiron-h'
  AND name IN (
    'Face pull en polea',
    'Pull-over con mancuerna'
  );

-- ── MOVER: func/funcional → sup/mono-tiron (curls de bíceps) ────────────────

UPDATE public.exercise_library
SET category = 'sup', subcategory = 'mono-tiron', pattern = 'mono-tiron'
WHERE is_global = true AND category = 'func' AND subcategory = 'funcional'
  AND name IN (
    'Curl de bíceps con barra',
    'Curl de bíceps con mancuernas alternado',
    'Curl de bíceps en polea'
  );

-- ── INSERTAR: nuevos ejercicios Monoarticular de empuje 🎯 ───────────────────

INSERT INTO public.exercise_library
  (trainer_id, name, name_en, category, subcategory, pattern,
   muscle_group, muscle_primary, muscle_secondary, equipment, level, is_global, description)
VALUES
(null,'Vuelos laterales en polea baja','Low Cable Lateral Raise','sup','mono-empuje','mono-empuje','hombros','Deltoides lateral',null,'Polea',1,true,'Polea baja a un lado del cuerpo. Elevar el brazo lateralmente hasta la altura del hombro. Tensión constante por la polea a lo largo de todo el rango.'),
(null,'Extensión de tríceps en polea','Triceps Pushdown','sup','mono-empuje','mono-empuje','triceps','Tríceps',null,'Polea',1,true,'Codos fijos a los lados del cuerpo. Extender completamente los codos hacia abajo. Retornar con control. No mover los hombros.'),
(null,'Press francés con barra','French Press (Skull Crusher)','sup','mono-empuje','mono-empuje','triceps','Tríceps',null,'Barra',2,true,'Acostado en banco, barra desde los brazos extendidos hacia la frente o detrás de la cabeza. Codos fijos. Aislamiento de tríceps.'),
(null,'Patada de tríceps con mancuerna','Triceps Kickback','sup','mono-empuje','mono-empuje','triceps','Tríceps',null,'Mancuerna',1,true,'Torso paralelo al suelo apoyado en un banco. Codo fijo junto al cuerpo. Extender el brazo completamente hacia atrás. Bajar con control.'),
(null,'Fondos en banco para tríceps','Bench Dips','sup','mono-empuje','mono-empuje','triceps','Tríceps','Pecho','Banco',1,true,'Manos en el borde de un banco, piernas extendidas al frente. Bajar doblando los codos hasta ~90°. Ideal para principiantes y finalización del entrenamiento de tríceps.');

-- ── INSERTAR: nuevos ejercicios Monoarticular de tirón 🎯 ────────────────────

INSERT INTO public.exercise_library
  (trainer_id, name, name_en, category, subcategory, pattern,
   muscle_group, muscle_primary, muscle_secondary, equipment, level, is_global, description)
VALUES
(null,'Curl martillo','Hammer Curl','sup','mono-tiron','mono-tiron','biceps','Bíceps','Braquiorradial','Mancuernas',1,true,'Agarre neutro (pulgar hacia arriba). Elevar la mancuerna sin rotar la muñeca. Trabaja el bíceps y el braquiorradial. No balancear el torso.'),
(null,'Curl concentrado','Concentration Curl','sup','mono-tiron','mono-tiron','biceps','Bíceps',null,'Mancuerna',1,true,'Sentado, codo apoyado en la cara interna del muslo. Máximo aislamiento del bíceps. Contraer al máximo arriba. Bajar completamente.'),
(null,'Curl de bíceps en máquina','Machine Bicep Curl','sup','mono-tiron','mono-tiron','biceps','Bíceps',null,'Máquina',1,true,'Brazos apoyados sobre el soporte. Tensión constante a lo largo del rango. Ideal para aislar el bíceps sin compensar con el torso.'),
(null,'Remo al mentón','Upright Row','sup','mono-tiron','mono-tiron','hombros','Trapecio','Deltoides','Barra',2,true,'Barra frente al cuerpo, tirar hacia el mentón con codos hacia arriba y afuera. Énfasis en trapecio y deltoides medial. Precaución en caso de pinzamiento de hombro.');
