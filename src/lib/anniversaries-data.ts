
export type Organization = {
  name: string;
  dateFounded: string; // Global founding date
  phStart?: string | null; // Optional: PH operations start date
  countryOfOrigin: string;
  type: "Private Company" | "Government Agency" | "NGO" | "Other";
  industry: string;
};

export const anniversaryData: Organization[] = [
  // Private Companies - Philippines
  { name: "San Miguel Corporation", dateFounded: "1890-09-29", countryOfOrigin: "Philippines", type: "Private Company", industry: "Conglomerate" },
  { name: "Ayala Corporation", dateFounded: "1834-03-10", countryOfOrigin: "Philippines", type: "Private Company", industry: "Conglomerate" },
  { name: "Jollibee Foods Corporation", dateFounded: "1978-01-28", countryOfOrigin: "Philippines", type: "Private Company", industry: "Food & Beverage" },
  { name: "SM Investments Corporation", dateFounded: "1958-01-15", countryOfOrigin: "Philippines", type: "Private Company", industry: "Conglomerate" },
  { name: "PLDT Inc.", dateFounded: "1928-11-28", countryOfOrigin: "Philippines", type: "Private Company", industry: "Telecommunications" },
  { name: "Globe Telecom", dateFounded: "1935-01-15", countryOfOrigin: "Philippines", type: "Private Company", industry: "Telecommunications" },
  { name: "Meralco", dateFounded: "1903-03-24", countryOfOrigin: "Philippines", type: "Private Company", industry: "Energy & Utilities" },
  { name: "Bank of the Philippine Islands (BPI)", dateFounded: "1851-08-01", countryOfOrigin: "Philippines", type: "Private Company", industry: "Banking & Finance" },
  { name: "Metrobank", dateFounded: "1962-09-05", countryOfOrigin: "Philippines", type: "Private Company", industry: "Banking & Finance" },
  { name: "Universal Robina Corporation", dateFounded: "1954-09-28", countryOfOrigin: "Philippines", type: "Private Company", industry: "Food & Beverage" },
  { name: "Philippine Airlines (PAL)", dateFounded: "1941-02-26", countryOfOrigin: "Philippines", type: "Private Company", industry: "Aviation" },
  { name: "Cebu Pacific", dateFounded: "1988-08-26", countryOfOrigin: "Philippines", type: "Private Company", industry: "Aviation" },
  { name: "Aboitiz Equity Ventures", dateFounded: "1920-01-01", countryOfOrigin: "Philippines", type: "Private Company", industry: "Conglomerate" },
  { name: "LT Group, Inc.", dateFounded: "1937-05-27", countryOfOrigin: "Philippines", type: "Private Company", industry: "Conglomerate" },
  { name: "GT Capital Holdings", dateFounded: "2007-01-01", countryOfOrigin: "Philippines", type: "Private Company", industry: "Conglomerate" },
  { name: "Mercury Drug", dateFounded: "1945-03-01", countryOfOrigin: "Philippines", type: "Private Company", industry: "Retail & Pharmacy" },
  { name: "National Book Store", dateFounded: "1942-01-01", countryOfOrigin: "Philippines", type: "Private Company", industry: "Retail" },
  { name: "GMA Network", dateFounded: "1950-03-01", countryOfOrigin: "Philippines", type: "Private Company", industry: "Media & Entertainment" },
  { name: "ABS-CBN Corporation", dateFounded: "1946-06-13", countryOfOrigin: "Philippines", type: "Private Company", industry: "Media & Entertainment" },

  // Private Companies - USA
  { name: "Coca-Cola Philippines", dateFounded: "1886-05-08", phStart: "1912-01-01", countryOfOrigin: "USA", type: "Private Company", industry: "Food & Beverage" },
  { name: "Procter & Gamble (P&G) Philippines", dateFounded: "1837-10-31", phStart: "1935-01-01", countryOfOrigin: "USA", type: "Private Company", industry: "Consumer Goods" },
  { name: "McDonald's Philippines", dateFounded: "1940-05-15", phStart: "1981-09-10", countryOfOrigin: "USA", type: "Private Company", industry: "Food & Beverage" },
  { name: "Citibank Philippines", dateFounded: "1812-06-16", phStart: "1902-07-01", countryOfOrigin: "USA", type: "Private Company", industry: "Banking & Finance" },
  { name: "Ford Motor Company Philippines", dateFounded: "1903-06-16", phStart: "1997-01-01", countryOfOrigin: "USA", type: "Private Company", industry: "Automotive" },
  { name: "IBM Philippines", dateFounded: "1911-06-16", phStart: "1937-07-20", countryOfOrigin: "USA", type: "Private Company", industry: "Technology" },
  { name: "Microsoft Philippines", dateFounded: "1975-04-04", phStart: "1995-01-01", countryOfOrigin: "USA", type: "Private Company", industry: "Technology" },
  { name: "Google Philippines", dateFounded: "1998-09-04", phStart: "2013-01-23", countryOfOrigin: "USA", type: "Private Company", industry: "Technology" },
  { name: "Amazon Web Services (AWS) Philippines", dateFounded: "1994-07-05", phStart: "2016-01-01", countryOfOrigin: "USA", type: "Private Company", industry: "Technology" },
  { name: "Starbucks Philippines", dateFounded: "1971-03-30", phStart: "1997-12-04", countryOfOrigin: "USA", type: "Private Company", industry: "Food & Beverage" },
  
  // Private Companies - Japan
  { name: "Toyota Motor Philippines", dateFounded: "1937-08-28", phStart: "1988-08-03", countryOfOrigin: "Japan", type: "Private Company", industry: "Automotive" },
  { name: "Mitsubishi Motors Philippines", dateFounded: "1917-04-22", phStart: "1963-02-20", countryOfOrigin: "Japan", type: "Private Company", industry: "Automotive" },
  { name: "Sony Philippines", dateFounded: "1946-05-07", phStart: "1996-01-01", countryOfOrigin: "Japan", type: "Private Company", industry: "Electronics" },
  { name: "Panasonic Manufacturing Philippines", dateFounded: "1918-03-07", phStart: "1963-05-29", countryOfOrigin: "Japan", type: "Private Company", industry: "Electronics" },
  { name: "Uniqlo Philippines (Fast Retailing)", dateFounded: "1949-03-01", phStart: "2012-06-15", countryOfOrigin: "Japan", type: "Private Company", industry: "Retail & Apparel" },

  // Private Companies - South Korea
  { name: "Samsung Electronics Philippines", dateFounded: "1969-01-13", phStart: "1998-01-01", countryOfOrigin: "South Korea", type: "Private Company", industry: "Electronics" },
  { name: "Hyundai Asia Resources, Inc.", dateFounded: "1967-12-29", phStart: "2001-08-01", countryOfOrigin: "South Korea", type: "Private Company", industry: "Automotive" },
  { name: "LG Electronics Philippines", dateFounded: "1958-10-01", phStart: "1988-01-01", countryOfOrigin: "South Korea", type: "Private Company", industry: "Electronics" },

  // Private Companies - Europe
  { name: "Nestlé Philippines", dateFounded: "1866-01-01", phStart: "1911-01-01", countryOfOrigin: "Switzerland", type: "Private Company", industry: "Food & Beverage" },
  { name: "Unilever Philippines", dateFounded: "1929-09-02", phStart: "1927-01-01", countryOfOrigin: "United Kingdom", type: "Private Company", industry: "Consumer Goods" },
  { name: "Shell Philippines", dateFounded: "1907-01-01", phStart: "1914-01-01", countryOfOrigin: "Netherlands", type: "Private Company", industry: "Energy & Utilities" },
  { name: "Bayer Philippines", dateFounded: "1863-08-01", phStart: "1962-01-01", countryOfOrigin: "Germany", type: "Private Company", industry: "Pharmaceuticals & Agribusiness" },
  
  // Private Companies - ASEAN
  { name: "AirAsia Philippines", dateFounded: "1993-12-20", phStart: "2010-12-01", countryOfOrigin: "Malaysia", type: "Private Company", industry: "Aviation" },
  
  // Government Agencies
  { name: "Bangko Sentral ng Pilipinas (BSP)", dateFounded: "1993-07-03", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Government & Public Sector" },
  { name: "Department of Education (DepEd)", dateFounded: "1901-01-21", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Government & Public Sector" },
  { name: "Department of Health (DOH)", dateFounded: "1898-09-29", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Government & Public Sector" },
  { name: "Social Security System (SSS)", dateFounded: "1957-09-01", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Government & Public Sector" },
  { name: "Government Service Insurance System (GSIS)", dateFounded: "1936-11-14", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Government & Public Sector" },
  { name: "Philippine National Police (PNP)", dateFounded: "1991-01-29", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Government & Public Sector" },
  { name: "Armed Forces of the Philippines (AFP)", dateFounded: "1897-03-22", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Government & Public Sector" },
  { name: "Bureau of Internal Revenue (BIR)", dateFounded: "1904-08-01", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Government & Public Sector" },
  { name: "Civil Service Commission (CSC)", dateFounded: "1900-09-19", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Government & Public Sector" },
  { name: "Land Bank of the Philippines", dateFounded: "1963-08-08", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Banking & Finance" },
  { name: "Development Bank of the Philippines (DBP)", dateFounded: "1947-01-02", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Banking & Finance" },
  { name: "PAG-IBIG Fund (HDMF)", dateFounded: "1978-12-14", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Government & Public Sector" },
  { name: "Philippine Health Insurance Corporation (PhilHealth)", dateFounded: "1995-02-14", countryOfOrigin: "Philippines", type: "Government Agency", industry: "Healthcare" },

  // NGOs & Other Organizations
  { name: "Philippine Red Cross", dateFounded: "1947-04-15", countryOfOrigin: "Philippines", type: "NGO", industry: "Humanitarian Aid" },
  { name: "Gawad Kalinga", dateFounded: "2003-10-04", countryOfOrigin: "Philippines", type: "NGO", industry: "Community Development" },
  { name: "Haribon Foundation", dateFounded: "1972-11-22", countryOfOrigin: "Philippines", type: "NGO", industry: "Environmental" },
  { name: "WWF-Philippines", dateFounded: "1961-04-29", phStart: "1997-02-13", countryOfOrigin: "Switzerland", type: "NGO", industry: "Environmental" },
  { name: "CARA Welfare Philippines", dateFounded: "2000-01-01", countryOfOrigin: "Philippines", type: "NGO", industry: "Animal Welfare" },
  { name: "Philippine Chamber of Commerce and Industry (PCCI)", dateFounded: "1978-07-01", countryOfOrigin: "Philippines", type: "Other", industry: "Business Association" },
  { name: "Makati Business Club (MBC)", dateFounded: "1981-01-01", countryOfOrigin: "Philippines", type: "Other", industry: "Business Association" },
  { name: "American Chamber of Commerce of the Philippines (AmCham)", dateFounded: "1920-01-01", countryOfOrigin: "USA", type: "Other", industry: "Business Association" },
  { name: "European Chamber of Commerce of the Philippines (ECCP)", dateFounded: "1978-01-01", countryOfOrigin: "Europe", type: "Other", industry: "Business Association" },
  { name: "University of the Philippines", dateFounded: "1908-06-18", countryOfOrigin: "Philippines", type: "Other", industry: "Education" },
  { name: "Ateneo de Manila University", dateFounded: "1859-12-10", countryOfOrigin: "Philippines", type: "Other", industry: "Education" },
  { name: "De La Salle University", dateFounded: "1911-06-16", countryOfOrigin: "Philippines", type: "Other", industry: "Education" },
  { name: "University of Santo Tomas", dateFounded: "1611-04-28", countryOfOrigin: "Philippines", type: "Other", industry: "Education" },
  { name: "Cultural Center of the Philippines (CCP)", dateFounded: "1966-06-25", countryOfOrigin: "Philippines", type: "Other", industry: "Arts & Culture" }
];
