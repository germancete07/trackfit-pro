-- migration_v28: subcategoría Flexión plantar 🦶 en Tren inferior

INSERT INTO public.exercise_library
  (trainer_id, name, name_en, category, subcategory, pattern,
   muscle_group, muscle_primary, muscle_secondary, equipment, level, is_global, description)
VALUES
(null,'Elevación de talones de pie','Standing Calf Raise','inf','flexion-plantar','flexion-plantar','piernas','Gastrocnemio',null,'Máquina / Peso corporal',1,true,'Rango completo de movimiento: bajar el talón por debajo del nivel de apoyo y subir hasta la punta máxima. Pausa arriba para maximizar la contracción.'),
(null,'Elevación de talones sentado','Seated Calf Raise','inf','flexion-plantar','flexion-plantar','piernas','Sóleo',null,'Máquina',1,true,'Rodillas a 90°. La posición sentado enfatiza el sóleo por encima del gastrocnemio. Bajar hasta el estiramiento completo.'),
(null,'Elevación de talones unilateral','Single-Leg Calf Raise','inf','flexion-plantar','flexion-plantar','piernas','Gastrocnemio',null,'Peso corporal',2,true,'Mayor rango de movimiento y dificultad que la variante bilateral. Apoyarse en una superficie para equilibrio. Bajar lento.'),
(null,'Elevación de talones en prensa','Calf Press on Leg Press','inf','flexion-plantar','flexion-plantar','piernas','Gastrocnemio','Sóleo','Máquina',1,true,'Pies en el borde inferior de la plataforma de la prensa. Extender y flexionar el tobillo en todo el rango. Rodillas ligeramente flexionadas.'),
(null,'Salto a la soga','Jump Rope','inf','flexion-plantar','flexion-plantar','piernas','Pantorrillas','Cardio','Soga',1,true,'Aterrizaje suave en el antepié, nunca con el talón. Mantener los codos cerca del cuerpo. Excelente para coordinación y acondicionamiento de pantorrillas.'),
(null,'Dorsiflexión con banda','Banded Dorsiflexion','inf','flexion-plantar','flexion-plantar','piernas','Tibial anterior',null,'Banda',1,true,'Banda anclada detrás del tobillo. Flexionar el pie hacia arriba contra la resistencia. Útil para movilidad de tobillo y prevención de lesiones.');
