import "server-only";
import type { User } from "./auth";
import { isEnrolled, type Course } from "./queries";

export function canAccessCourse(user: User | null, course: Course): { full: boolean; owner: boolean; enrolled: boolean } {
  const owner = !!user && user.id === course.instructor_id;
  const enrolled = !!user && isEnrolled(user.id, course.id);
  return { full: owner || enrolled, owner, enrolled };
}
