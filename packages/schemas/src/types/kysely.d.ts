declare module 'kysely' {
  export type Selectable<T> = {
    [K in keyof T]: T[K]
  }

  export type Insertable<T> = Partial<{
    [K in keyof T]: T[K]
  }>

  export type Updateable<T> = Partial<{
    [K in keyof T]: T[K]
  }>
}
