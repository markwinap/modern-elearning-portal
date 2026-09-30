# Role Permission Matrix

This document describes the role-based permissions currently implemented by the application.

## Roles

| Role        | Purpose                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------ |
| **Student** | Learns through enrolled courses and manages their own learning records.                    |
| **Teacher** | Creates and manages courses, content, assessments, and learners assigned to their courses. |
| **Admin**   | Manages the platform and may perform teacher operations across courses.                    |

## Access levels

The server defines three authenticated access levels:

- **Authenticated** (`protectedProcedure`): available to students, teachers, and admins.
- **Teacher** (`teacherProcedure`): available to teachers and admins.
- **Admin** (`adminProcedure`): available only to admins.

Page navigation is not an authorization boundary. Permissions are enforced by server-side route guards, tRPC procedures, and resource ownership checks.

## Permission matrix

| Capability                                                      | Student |    Teacher    |    Admin     | Scope and conditions                                                                                                                                        |
| --------------------------------------------------------------- | :-----: | :-----------: | :----------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in and access the protected application                    |   Yes   |      Yes      |     Yes      | A valid session is required.                                                                                                                                |
| View role-specific dashboard                                    |   Yes   |      Yes      |     Yes      | Dashboard statistics and content vary by role.                                                                                                              |
| Browse the course catalog and view course details               |   Yes   |      Yes      |     Yes      | Catalog and published course information are publicly readable.                                                                                             |
| Self-enroll, join a waitlist, or unenroll                       |   Yes   |      Yes      |     Yes      | Subject to the course enrollment mode, access key, capacity, dates, and existing enrollment state.                                                          |
| Access course learning content                                  |   Yes   |      Yes      |     Yes      | Students require an active enrollment and must satisfy content-release rules; teachers and admins bypass the enrollment requirement in the learning layout. |
| Track own activity and course progress                          |   Yes   |      Yes      |     Yes      | Updates apply to the current user's records.                                                                                                                |
| Take quizzes and submit workshop work                           |   Yes   |      Yes      |     Yes      | Subject to enrollment, release rules, attempt limits, and activity configuration.                                                                           |
| View own grades, achievements, skills, badges, and certificates |   Yes   |      Yes      |     Yes      | Results are restricted to the current user.                                                                                                                 |
| Renew an eligible own certificate                               |   Yes   |      Yes      |     Yes      | Certificate ownership and renewal eligibility are checked.                                                                                                  |
| Join learning paths and view own path progress                  |   Yes   |      Yes      |     Yes      | Operations apply to the current user.                                                                                                                       |
| Search application content                                      |   Yes   |      Yes      |     Yes      | A signed-in session is required.                                                                                                                            |
| Use course discussions and messaging                            |   Yes   |      Yes      |     Yes      | Access is restricted by course participation or message-thread membership where applicable.                                                                 |
| View and manage own notifications and preferences               |   Yes   |      Yes      |     Yes      | Operations apply to the current user.                                                                                                                       |
| Create a course                                                 |   No    |      Yes      |     Yes      | The creator becomes the assigned teacher and the course starts as a draft.                                                                                  |
| View the teaching course list                                   |   No    |      Yes      |     Yes      | Teachers may filter to their courses; admins have teacher-level API access.                                                                                 |
| Edit, publish, or delete a draft course                         |   No    |  Own courses  |  Any course  | Ownership is enforced for teachers; admins may act across courses.                                                                                          |
| Reassign a course teacher                                       |   No    |      No       |     Yes      | The assignee must have the teacher or admin role.                                                                                                           |
| Archive a course                                                |   No    |      No       |     Yes      | Admin-only operation.                                                                                                                                       |
| Manage sections, activities, release rules, and ordering        |   No    |  Own courses  |  Any course  | Teacher endpoints also require course ownership; admins bypass ownership checks.                                                                            |
| Manage course announcements and discussions                     |   No    |  Own courses  |  Any course  | Management is scoped to the assigned teacher unless the user is an admin.                                                                                   |
| Manage quizzes and quiz questions                               |   No    |  Own courses  |  Any course  | Includes configuration, question editing, deletion, and assessment insights.                                                                                |
| Manage the reusable question bank                               |   No    | Own resources | Any resource | Teachers manage their question-bank content and may add questions only to owned courses; admins have elevated access.                                       |
| Manage workshops and rubrics                                    |   No    |  Own courses  |  Any course  | Includes grading and teacher assessment operations.                                                                                                         |
| View and manage course students                                 |   No    |  Own courses  |  Any course  | Includes pending enrollments, approvals, rejections, and enrollment status updates.                                                                         |
| View the course gradebook and submit grades                     |   No    |  Own courses  |  Any course  | Grade categories and course grade summaries follow the same ownership rule.                                                                                 |
| View course insights and enrollment counts                      |   No    |  Own courses  |  Any course  | Restricted by course ownership or admin role.                                                                                                               |
| Manage certificate templates; issue or revoke certificates      |   No    |  Own courses  |  Any course  | Teacher ownership is checked against the certificate's course.                                                                                              |
| List teachers for course assignment                             |   No    |      Yes      |     Yes      | Returns users with teacher or admin roles.                                                                                                                  |
| Create and manage learning paths                                |   No    |      No       |     Yes      | The current teaching-page guard and tRPC mutations are admin-only.                                                                                          |
| Manage users                                                    |   No    |      No       |     Yes      | Includes listing users, changing roles, banning, and unbanning users.                                                                                       |
| View platform-wide user and course statistics                   |   No    |      No       |     Yes      | Admin-only dashboard data.                                                                                                                                  |
| Manage all courses                                              |   No    |      No       |     Yes      | Includes platform-wide listing, reassignment, and archival.                                                                                                 |
| Manage course categories                                        |   No    |      No       |     Yes      | Category reads are public; writes are admin-only.                                                                                                           |
| Manage skills and skill categories                              |   No    |      No       |     Yes      | Includes mapping skills to courses and activities.                                                                                                          |
| Configure gamification                                          |   No    |      No       |     Yes      | Includes viewing/updating configuration and refreshing leaderboard data.                                                                                    |
| Manage platform settings                                        |   No    |      No       |     Yes      | Admin-only read and update operations.                                                                                                                      |
| View security audit logs                                        |   No    |      No       |     Yes      | Includes audit entries, action filters, and resource-type filters.                                                                                          |
| Access `/admin` pages                                           |   No    |      No       |     Yes      | Enforced by the admin route-group layout.                                                                                                                   |

## Default navigation

| Student        | Teacher       | Admin          |
| -------------- | ------------- | -------------- |
| Dashboard      | Dashboard     | Overview       |
| Browse Courses | All Courses   | Users          |
| My Grades      | Question Bank | Categories     |
| Achievements   | Messages      | All Courses    |
| Certificates   | Notifications | Settings       |
| Learning Paths |               | Gamification   |
| Skills         |               | Skills         |
| Messages       |               | Learning Paths |
| Notifications  |               | Security       |
|                |               | Notifications  |

Navigation reflects the primary experience for each role, but it does not grant or revoke permissions. For example, admins are accepted by teacher-level API procedures even when a teacher page is not present in the admin navigation.

## Implementation references

- Role enum: [`src/server/db/schema.ts`](src/server/db/schema.ts)
- tRPC authorization middleware: [`src/server/api/trpc.ts`](src/server/api/trpc.ts)
- Resource ownership checks: [`src/server/api/ownership.ts`](src/server/api/ownership.ts)
- Role-specific navigation: [`src/lib/nav-config.tsx`](src/lib/nav-config.tsx)
- Protected dashboard guard: [`src/app/(dashboard)/layout.tsx`](<src/app/(dashboard)/layout.tsx>)
- Admin route guard: [`src/app/(admin)/layout.tsx`](<src/app/(admin)/layout.tsx>)
- API routers: [`src/server/api/routers`](src/server/api/routers)

## Legend

- **Yes**: permitted for the role, subject to the conditions in the final column.
- **No**: not permitted for the role.
- **Own courses/resources**: permitted only when the teacher owns or is assigned to the underlying resource.
- **Any course/resource**: admins may bypass teacher ownership checks where `assertOwnerOrAdmin` is used.
