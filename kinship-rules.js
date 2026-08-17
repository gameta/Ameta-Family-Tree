// Hindi Kinship Rule Engine
// Derives culturally-correct relationship labels from graph paths

const KINSHIP_RULES_HI = [
  // === PARENTS ===
  { pattern: ['father'], hi: 'पिता (Pita)', en: 'Father' },
  { pattern: ['mother'], hi: 'माँ (Maa)', en: 'Mother' },

  // === GRANDPARENTS (Paternal) ===
  { pattern: ['father', 'father'], hi: 'दादाजी (Dadaji)', en: 'Paternal Grandfather' },
  { pattern: ['father', 'mother'], hi: 'दादी (Dadi)', en: 'Paternal Grandmother' },

  // === GRANDPARENTS (Maternal) ===
  { pattern: ['mother', 'father'], hi: 'नानाजी (Nanaji)', en: 'Maternal Grandfather' },
  { pattern: ['mother', 'mother'], hi: 'नानी (Nani)', en: 'Maternal Grandmother' },

  // === GREAT-GRANDPARENTS (Paternal-Paternal) ===
  { pattern: ['father', 'father', 'father'], hi: 'पर-दादाजी (Par-Dadaji)', en: 'Paternal Great-Grandfather' },
  { pattern: ['father', 'father', 'mother'], hi: 'पर-दादी (Par-Dadi)', en: 'Paternal Great-Grandmother' },

  // === GREAT-GRANDPARENTS (Maternal-Maternal) ===
  { pattern: ['mother', 'mother', 'father'], hi: 'पर-नानाजी (Par-Nanaji)', en: 'Maternal Great-Grandfather' },
  { pattern: ['mother', 'mother', 'mother'], hi: 'पर-नानी (Par-Nani)', en: 'Maternal Great-Grandmother' },

  // === CHILDREN ===
  { pattern: ['son'], hi: 'बेटा (Beta)', en: 'Son' },
  { pattern: ['daughter'], hi: 'बेटी (Beti)', en: 'Daughter' },

  // === GRANDCHILDREN (through son) ===
  { pattern: ['son', 'son'], hi: 'पोता (Pota)', en: 'Grandson (son\'s son)' },
  { pattern: ['son', 'daughter'], hi: 'पोती (Poti)', en: 'Granddaughter (son\'s daughter)' },

  // === GRANDCHILDREN (through daughter) ===
  { pattern: ['daughter', 'son'], hi: 'दोहिता (Dohita)', en: 'Grandson (daughter\'s son)' },
  { pattern: ['daughter', 'daughter'], hi: 'दोहिती (Dohiti)', en: 'Granddaughter (daughter\'s daughter)' },

  // === SIBLINGS ===
  { pattern: ['sibling.M.elder'], hi: 'भैया (Bhaiya)', en: 'Elder Brother' },
  { pattern: ['sibling.M.younger'], hi: 'छोटा भाई (Chhota Bhai)', en: 'Younger Brother' },
  { pattern: ['sibling.M'], hi: 'भाई (Bhai)', en: 'Brother' },
  { pattern: ['sibling.F.elder'], hi: 'दीदी (Didi)', en: 'Elder Sister' },
  { pattern: ['sibling.F.younger'], hi: 'छोटी बहन (Chhoti Bahan)', en: 'Younger Sister' },
  { pattern: ['sibling.F'], hi: 'बहन (Bahan)', en: 'Sister' },

  // === FATHER'S BROTHERS ===
  { pattern: ['father', 'sibling.M.elder'], hi: 'ताऊजी (Tauji)', en: 'Father\'s Elder Brother' },
  { pattern: ['father', 'sibling.M.younger'], hi: 'चाचाजी (Chachaji)', en: 'Father\'s Younger Brother' },

  // === FATHER'S BROTHERS' WIVES ===
  { pattern: ['father', 'sibling.M.elder', 'spouse.F'], hi: 'ताई (Tai)', en: 'Father\'s Elder Brother\'s Wife' },
  { pattern: ['father', 'sibling.M.younger', 'spouse.F'], hi: 'चाची (Chachi)', en: 'Father\'s Younger Brother\'s Wife' },

  // === FATHER'S SISTER ===
  { pattern: ['father', 'sibling.F'], hi: 'बुआ (Bua)', en: 'Father\'s Sister' },
  { pattern: ['father', 'sibling.F', 'spouse.M'], hi: 'फूफाजी (Fufaji)', en: 'Father\'s Sister\'s Husband' },

  // === MOTHER'S BROTHERS ===
  { pattern: ['mother', 'sibling.M'], hi: 'मामा (Mama)', en: 'Mother\'s Brother' },
  { pattern: ['mother', 'sibling.M', 'spouse.F'], hi: 'मामी (Mami)', en: 'Mother\'s Brother\'s Wife' },

  // === MOTHER'S SISTER ===
  { pattern: ['mother', 'sibling.F'], hi: 'मौसी (Mausi)', en: 'Mother\'s Sister' },
  { pattern: ['mother', 'sibling.F', 'spouse.M'], hi: 'मौसा (Mausa)', en: 'Mother\'s Sister\'s Husband' },

  // === NEPHEWS/NIECES (Brother's children) ===
  { pattern: ['sibling.M', 'son'], hi: 'भतीजा (Bhatija)', en: 'Brother\'s Son' },
  { pattern: ['sibling.M', 'daughter'], hi: 'भतीजी (Bhatiji)', en: 'Brother\'s Daughter' },

  // === NEPHEWS/NIECES (Sister's children) ===
  { pattern: ['sibling.F', 'son'], hi: 'भांजा (Bhanja)', en: 'Sister\'s Son' },
  { pattern: ['sibling.F', 'daughter'], hi: 'भांजी (Bhanji)', en: 'Sister\'s Daughter' },

  // === SPOUSE ===
  { pattern: ['spouse.F'], hi: 'पत्नी (Patni)', en: 'Wife' },
  { pattern: ['spouse.M'], hi: 'पति (Pati)', en: 'Husband' },

  // === HUSBAND'S FAMILY ===
  { pattern: ['spouse.M', 'father'], hi: 'ससुर (Sasur)', en: 'Father-in-law' },
  { pattern: ['spouse.M', 'mother'], hi: 'सास (Saas)', en: 'Mother-in-law' },
  { pattern: ['spouse.M', 'sibling.M.elder'], hi: 'जेठ (Jeth)', en: 'Husband\'s Elder Brother' },
  { pattern: ['spouse.M', 'sibling.M.younger'], hi: 'देवर (Devar)', en: 'Husband\'s Younger Brother' },
  { pattern: ['spouse.M', 'sibling.M.elder', 'spouse.F'], hi: 'जेठानी (Jethani)', en: 'Husband\'s Elder Brother\'s Wife' },
  { pattern: ['spouse.M', 'sibling.M.younger', 'spouse.F'], hi: 'देवरानी (Devrani)', en: 'Husband\'s Younger Brother\'s Wife' },
  { pattern: ['spouse.M', 'sibling.F'], hi: 'ननद (Nanad)', en: 'Husband\'s Sister' },
  { pattern: ['spouse.M', 'sibling.F', 'spouse.M'], hi: 'नंदोई (Nandoi)', en: 'Husband\'s Sister\'s Husband' },

  // === WIFE'S FAMILY ===
  { pattern: ['spouse.F', 'father'], hi: 'ससुर (Sasur)', en: 'Father-in-law' },
  { pattern: ['spouse.F', 'mother'], hi: 'सास (Saas)', en: 'Mother-in-law' },
  { pattern: ['spouse.F', 'sibling.M'], hi: 'साला (Sala)', en: 'Wife\'s Brother' },
  { pattern: ['spouse.F', 'sibling.M', 'spouse.F'], hi: 'सलहज (Salhaj)', en: 'Wife\'s Brother\'s Wife' },
  { pattern: ['spouse.F', 'sibling.F'], hi: 'साली (Sali)', en: 'Wife\'s Sister' },
  { pattern: ['spouse.F', 'sibling.F', 'spouse.M'], hi: 'साढ़ू (Sadhu)', en: 'Wife\'s Sister\'s Husband' },

  // === CO-IN-LAWS ===
  { pattern: ['son', 'spouse.F', 'father'], hi: 'समधी (Samdhi)', en: 'Son\'s Father-in-law' },
  { pattern: ['son', 'spouse.F', 'mother'], hi: 'समधन (Samdhan)', en: 'Son\'s Mother-in-law' },
  { pattern: ['daughter', 'spouse.M', 'father'], hi: 'समधी (Samdhi)', en: 'Daughter\'s Father-in-law' },
  { pattern: ['daughter', 'spouse.M', 'mother'], hi: 'समधन (Samdhan)', en: 'Daughter\'s Mother-in-law' },

  // === SON/DAUGHTER-IN-LAW ===
  { pattern: ['son', 'spouse.F'], hi: 'बहू (Bahu)', en: 'Daughter-in-law' },
  { pattern: ['daughter', 'spouse.M'], hi: 'दामाद (Damad)', en: 'Son-in-law' },

  // === COUSINS (Father's Brother's Children) ===
  { pattern: ['father', 'sibling.M', 'son'], hi: 'चचेरा भाई (Chachera Bhai)', en: 'Paternal Uncle\'s Son' },
  { pattern: ['father', 'sibling.M', 'daughter'], hi: 'चचेरी बहन (Chacheri Bahan)', en: 'Paternal Uncle\'s Daughter' },

  // === COUSINS (Father's Sister's Children) ===
  { pattern: ['father', 'sibling.F', 'son'], hi: 'फुफेरा भाई (Fufera Bhai)', en: 'Paternal Aunt\'s Son' },
  { pattern: ['father', 'sibling.F', 'daughter'], hi: 'फुफेरी बहन (Fuferi Bahan)', en: 'Paternal Aunt\'s Daughter' },

  // === COUSINS (Mother's Brother's Children) ===
  { pattern: ['mother', 'sibling.M', 'son'], hi: 'ममेरा भाई (Mamera Bhai)', en: 'Maternal Uncle\'s Son' },
  { pattern: ['mother', 'sibling.M', 'daughter'], hi: 'ममेरी बहन (Mameri Bahan)', en: 'Maternal Uncle\'s Daughter' },

  // === COUSINS (Mother's Sister's Children) ===
  { pattern: ['mother', 'sibling.F', 'son'], hi: 'मौसेरा भाई (Mausera Bhai)', en: 'Maternal Aunt\'s Son' },
  { pattern: ['mother', 'sibling.F', 'daughter'], hi: 'मौसेरी बहन (Mauseri Bahan)', en: 'Maternal Aunt\'s Daughter' },
];

// Export for use in main app
if (typeof module !== 'undefined') module.exports = { KINSHIP_RULES_HI };
