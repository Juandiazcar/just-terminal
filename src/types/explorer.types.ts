export interface DirEntry {
  name: string
  path: string
  isDir: boolean
  isHidden: boolean
  size?: number
  modifiedAt?: number
}

export interface FsChangeEvent {
  kind: "created" | "modified" | "deleted" | "renamed"
  path: string
  newPath?: string
}
