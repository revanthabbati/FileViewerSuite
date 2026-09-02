// Flattens the Interchange > FunctionalGroup > TransactionSet hierarchy into a
// single list, which most of the UI iterates over rather than re-walking the tree.
export function getAllTransactionSets(parsed) {
  const list = []
  if (!parsed) return list
  for (const ic of parsed.interchanges) {
    for (const grp of ic.functionalGroups) {
      for (const t of grp.transactionSets) {
        list.push({ interchange: ic, group: grp, txn: t })
      }
    }
  }
  return list
}
