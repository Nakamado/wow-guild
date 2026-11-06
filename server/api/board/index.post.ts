/** Aushang anlegen (nur Admins) */
export default defineEventHandler(async (event) => {
  const { store, viewer, input } = await beginBoardWrite(event, { withBody: true })
  setResponseStatus(event, 201)
  return persist(() => store.create(viewer.memberId!, input!))
})
