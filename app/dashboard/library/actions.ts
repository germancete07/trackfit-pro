"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createLibraryExerciseAction(data: {
  name: string; muscle_group: string; description: string;
  youtube_url: string; image_url: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("exercise_library").insert({
    trainer_id: user.id,
    name: data.name.trim(),
    muscle_group: data.muscle_group,
    description: data.description.trim() || null,
    youtube_url: data.youtube_url.trim() || null,
    image_url: data.image_url.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/library");
  return { success: true };
}

export async function updateLibraryExerciseAction(id: string, data: {
  name: string; muscle_group: string; description: string;
  youtube_url: string; image_url: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase.from("exercise_library").update({
    name: data.name.trim(),
    muscle_group: data.muscle_group,
    description: data.description.trim() || null,
    youtube_url: data.youtube_url.trim() || null,
    image_url: data.image_url.trim() || null,
  }).eq("id", id).eq("trainer_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/library");
  return { success: true };
}

export async function deleteLibraryExerciseAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase.from("exercise_library").delete().eq("id", id).eq("trainer_id", user.id);
  revalidatePath("/dashboard/library");
  return { success: true };
}

const BASE_EXERCISES = [
  // Pecho
  { name: "Press banca con barra", muscle_group: "pecho", description: "Acostado en el banco, bajar la barra hasta el pecho a la altura de los pezones. Codos a 45°. Empujar explosivamente al subir. Pies planos en el suelo." },
  { name: "Press banca con mancuernas", muscle_group: "pecho", description: "Mayor rango de movimiento que con barra. Al bajar, los codos van ligeramente por debajo del banco. Permite trabajar la estabilización escapular." },
  { name: "Aperturas con mancuernas", muscle_group: "pecho", description: "Brazos casi extendidos. Bajar lateralmente hasta sentir el estiramiento del pectoral. No bajar más allá de la línea de los hombros para evitar lesión." },
  { name: "Press banca inclinado con barra", muscle_group: "pecho", description: "Banco a 30–45°. Mayor énfasis en el pectoral superior y deltoides anterior. Misma técnica que el press plano." },
  // Espalda
  { name: "Dominadas", muscle_group: "espalda", description: "Desde colgado con agarre prono, llevar el pecho a la barra. Codos hacia abajo y atrás. Agarre supino activa más el bíceps." },
  { name: "Remo con barra", muscle_group: "espalda", description: "Torso inclinado ~45°, rodillas semiflexionadas. Llevar la barra al ombligo, codos cerca del cuerpo. No redondear la espalda baja." },
  { name: "Remo con mancuerna unilateral", muscle_group: "espalda", description: "Apoyar una mano y rodilla en el banco. Llevar la mancuerna hacia la cadera. Rotación escapular completa al final del movimiento." },
  { name: "Jalón al pecho en polea", muscle_group: "espalda", description: "Bajar la barra hasta la parte superior del pecho. Codos hacia abajo y atrás. No balancear el torso hacia atrás." },
  // Piernas
  { name: "Sentadilla con barra", muscle_group: "piernas", description: "Barra en los trapecios. Bajar hasta que los muslos queden paralelos o más abajo. Rodillas alineadas con los pies. Talones en el suelo." },
  { name: "Prensa de piernas", muscle_group: "piernas", description: "Pies al ancho de hombros en la plataforma. Bajar hasta 90° de flexión de rodilla. No despegar las lumbares del respaldo. No bloquear las rodillas al extender." },
  { name: "Extensión de cuádriceps en máquina", muscle_group: "piernas", description: "Extender completamente y bajar con control en 2–3 segundos. Movimiento de aislamiento para el cuádriceps. Evitar el rebote." },
  { name: "Curl femoral en máquina", muscle_group: "piernas", description: "Flexionar hasta aproximarse al glúteo. Mantener la cadera pegada al banco. Bajar controlado. Trabaja isquiotibiales." },
  { name: "Zancadas con mancuernas", muscle_group: "piernas", description: "Un pie adelante, bajar la rodilla trasera cerca del suelo. Torso erecto. Empujar con el talón del pie delantero para volver a la posición inicial." },
  // Hombros
  { name: "Press militar con barra", muscle_group: "hombros", description: "De pie o sentado. Desde los hombros, llevar la barra sobre la cabeza con brazos extendidos. No arquear la espalda lumbar. Core activo." },
  { name: "Elevaciones laterales con mancuernas", muscle_group: "hombros", description: "Elevar lateralmente hasta la altura de los hombros. Codo ligeramente flexionado. Pulgar ligeramente hacia abajo en el punto de máxima elevación. Bajar lento." },
  { name: "Elevaciones posteriores (pájaros)", muscle_group: "hombros", description: "Torso inclinado ~90°. Elevar los brazos lateralmente hasta la altura de los hombros. Trabaja el deltoides posterior. Control total en todo el rango." },
  // Bíceps
  { name: "Curl con barra", muscle_group: "biceps", description: "Codos fijos a los lados del torso. Llevar la barra hasta los hombros. No balancear el cuerpo. Bajar de forma controlada en 2–3 segundos." },
  { name: "Curl con mancuernas alternado", muscle_group: "biceps", description: "Alternar cada brazo. Girar la muñeca (supinación) a medida que sube. Codo fijo en el costado. Máxima contracción en el punto alto." },
  // Tríceps
  { name: "Press francés con barra EZ", muscle_group: "triceps", description: "Acostado. Bajar la barra hasta la frente o detrás de la cabeza, codos apuntando al techo. Extiende completamente. Trabaja el tríceps largo." },
  { name: "Extensión de tríceps en polea alta", muscle_group: "triceps", description: "Con cuerda o barra. Codos fijos a los lados, extender hacia abajo hasta bloquear. No mover los hombros. Separar la cuerda al final para mayor contracción." },
  // Core
  { name: "Plancha isométrica", muscle_group: "core", description: "Apoyado en antebrazos y puntas de pie. Cuerpo recto como tabla. Contraer abdomen y glúteos. No dejar caer las caderas ni elevarlas." },
  { name: "Crunch abdominal", muscle_group: "core", description: "Acostado, rodillas flexionadas. Llevar los hombros hacia las rodillas contrayendo el abdomen. No jalar el cuello. Espirar al subir." },
  { name: "Rueda abdominal (ab roller)", muscle_group: "core", description: "Desde rodillas, extender la rueda hasta casi tocar el suelo con el pecho. Mantener la espalda recta. Volver usando el abdomen, no los hombros." },
  // Glúteos
  { name: "Hip thrust con barra", muscle_group: "gluteos", description: "Hombros apoyados en banco, barra sobre las caderas con almohadilla. Empujar las caderas hacia arriba hasta alinear con el torso. Contraer glúteos en la posición alta." },
  { name: "Peso muerto rumano", muscle_group: "gluteos", description: "Con barra o mancuernas, bajar inclinando el torso manteniendo la espalda recta y rodillas casi extendidas. Sentir el estiramiento de los isquiotibiales." },
  // Cardio
  { name: "Caminata inclinada en cinta", muscle_group: "cardio", description: "Inclinación 5–10%, velocidad 5–7 km/h. Postura erguida, brazos en movimiento natural. Excelente LISS para quemar grasa sin impacto en las articulaciones." },
  { name: "Bicicleta estática", muscle_group: "cardio", description: "Resistencia moderada, cadencia de 70–90 rpm. Ideal como calentamiento, vuelta a la calma o sesión de recuperación activa." },
];

export async function importBaseExercisesAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Get existing names to avoid duplicates
  const { data: existing } = await supabase
    .from("exercise_library")
    .select("name")
    .eq("trainer_id", user.id);

  const existingNames = new Set((existing ?? []).map(e => e.name.toLowerCase()));
  const toInsert = BASE_EXERCISES
    .filter(ex => !existingNames.has(ex.name.toLowerCase()))
    .map(ex => ({ ...ex, trainer_id: user.id }));

  if (toInsert.length === 0) return { added: 0 };

  await supabase.from("exercise_library").insert(toInsert);
  revalidatePath("/dashboard/library");
  return { added: toInsert.length };
}
