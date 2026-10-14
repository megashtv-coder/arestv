/**
 * Ura mes "rifreskimit nga serveri" (hooks/useServerRefresh.js) dhe diffSync (context/AppContext.jsx).
 *
 * Pas një bashkimi, baza e re e diffSync (`prev…`) duhet të hyjë në fuqi pikërisht kur vargu i bashkuar bëhet
 * `curr` — jo para tij. Përndryshe një ekzekutim i vonuar i diffSync me gjendjen e vjetër do ta krahasonte
 * me bazën e re dhe mund të "shohë" rreshta të shtuar/fshirë që s'janë ndryshime lokale.
 * Çelësi është vetë objekti ref i bazës; vlera = { curr: vargu i bashkuar, base: baza e re }.
 */
export const pendingBases = new WeakMap()
