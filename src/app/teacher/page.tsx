import { redirect } from "next/navigation";
export default function TeacherRedirect() { redirect("/auth?mode=login&teacher=1"); }
