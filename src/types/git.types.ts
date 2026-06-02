export interface CommitInfo {
  id: string
  message: string
  author: string
  time: number
  parents: string[]
  refs: string[]
}

export interface GitStatus {
  branch: string
  isRepo: boolean
  isDirty: boolean
  modifiedCount: number
  stagedCount: number
  untrackedCount: number
  ahead: number
  behind: number
}
