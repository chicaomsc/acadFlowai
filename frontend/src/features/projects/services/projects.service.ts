import { archiveProject, createProject, getProjectDetails, getProjects, updateProject } from '@/shared/services/project.service'

export const projectsQuery = {
  queryKey: ['projects'],
  queryFn: getProjects,
}

export function projectDetailsQuery(projectId: string) {
  return {
    queryKey: ['project-details', projectId],
    queryFn: () => getProjectDetails(projectId),
  }
}

export { archiveProject, createProject, updateProject }
