// Moroccan baccalaureate catalog: grades + subjects (stored as units under one term per grade).
export type CatalogGrade = { title: string; stage: string; terms: { title: string; subjects: string[] }[] };
const common = ["الرياضيات", "الفيزياء والكيمياء", "علوم الحياة والأرض", "اللغة العربية", "اللغة الفرنسية", "اللغة الإنجليزية", "التربية الإسلامية", "الفلسفة", "التاريخ والجغرافيا", "المعلوميات"];
export const CATALOG: CatalogGrade[] = [
  { title: "أولى باكالوريا", stage: "السنة الأولى من سلك الباكالوريا", terms: [{ title: "المواد الدراسية", subjects: [...common, "الاقتصاد والتنظيم الإداري للمقاولات", "علوم المهندس"] }] },
  { title: "ثانية باكالوريا", stage: "السنة الثانية من سلك الباكالوريا (الامتحان الوطني)", terms: [{ title: "المواد الدراسية", subjects: [...common, "الاقتصاد العام والإحصاء", "المحاسبة والرياضيات المالية", "علوم المهندس", "الامتحان الوطني: نماذج وتصحيح"] }] },
  { title: "ثالثة ثانوي", stage: "السنة الثالثة من التعليم الثانوي", terms: [{ title: "المواد الدراسية", subjects: [...common, "مراجعة شاملة ونماذج امتحانات"] }] },
];
