
export type Organization = {
  name: string;
  dateFounded: string; // Global founding date
  phStart?: string | null; // Optional: PH operations start date
  countryOfOrigin: string;
  type: "Private Company" | "BPO/In-House" | "Government Agency" | "NGO" | "Brotherhood" | "Other";
  subDepartment: string;
  industry: string;
};

export const anniversaryData: Organization[] = [
  // --- EXISTING DATA (Enriched with subDepartment) ---
  // Private Companies - Philippines
  { name: "San Miguel Corporation", dateFounded: "1890-09-29", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Other", industry: "Conglomerate" },
  { name: "Ayala Corporation", dateFounded: "1834-03-10", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Other", industry: "Conglomerate" },
  { name: "Jollibee Foods Corporation", dateFounded: "1978-01-28", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Food & Beverages", industry: "Food & Beverage" },
  { name: "SM Investments Corporation", dateFounded: "1958-01-15", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Retail", industry: "Conglomerate" },
  { name: "PLDT Inc.", dateFounded: "1928-11-28", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Technology", industry: "Telecommunications" },
  { name: "Globe Telecom", dateFounded: "1935-01-15", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Technology", industry: "Telecommunications" },
  { name: "Meralco", dateFounded: "1903-03-24", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Other", industry: "Energy & Utilities" },
  { name: "Bank of the Philippine Islands (BPI)", dateFounded: "1851-08-01", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Finance", industry: "Banking & Finance" },
  { name: "Metrobank", dateFounded: "1962-09-05", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Finance", industry: "Banking & Finance" },
  { name: "Universal Robina Corporation", dateFounded: "1954-09-28", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Food & Beverages", industry: "Food & Beverage" },
  { name: "Philippine Airlines (PAL)", dateFounded: "1941-02-26", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Travel & Hospitality", industry: "Aviation" },
  { name: "Cebu Pacific", dateFounded: "1988-08-26", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Travel & Hospitality", industry: "Aviation" },
  { name: "Aboitiz Equity Ventures", dateFounded: "1920-01-01", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Other", industry: "Conglomerate" },
  { name: "LT Group, Inc.", dateFounded: "1937-05-27", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Other", industry: "Conglomerate" },
  { name: "GT Capital Holdings", dateFounded: "2007-01-01", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Other", industry: "Conglomerate" },
  { name: "Mercury Drug", dateFounded: "1945-03-01", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Retail", industry: "Retail & Pharmacy" },
  { name: "National Book Store", dateFounded: "1942-01-01", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Retail", industry: "Retail" },
  { name: "GMA Network", dateFounded: "1950-03-01", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Other", industry: "Media & Entertainment" },
  { name: "ABS-CBN Corporation", dateFounded: "1946-06-13", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Other", industry: "Media & Entertainment" },

  // Private Companies - Foreign
  { name: "Coca-Cola Philippines", dateFounded: "1886-05-08", phStart: "1912-01-01", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Food & Beverages", industry: "Food & Beverage" },
  { name: "Procter & Gamble (P&G) Philippines", dateFounded: "1837-10-31", phStart: "1935-01-01", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Retail", industry: "Consumer Goods" },
  { name: "McDonald's Philippines", dateFounded: "1940-05-15", phStart: "1981-09-10", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Food & Beverages", industry: "Food & Beverage" },
  { name: "Citibank Philippines", dateFounded: "1812-06-16", phStart: "1902-07-01", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Finance", industry: "Banking & Finance" },
  { name: "Ford Motor Company Philippines", dateFounded: "1903-06-16", phStart: "1997-01-01", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Manufacturing", industry: "Automotive" },
  { name: "IBM Philippines", dateFounded: "1911-06-16", phStart: "1937-07-20", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Technology", industry: "Technology" },
  { name: "Microsoft Philippines", dateFounded: "1975-04-04", phStart: "1995-01-01", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Technology", industry: "Technology" },
  { name: "Google Philippines", dateFounded: "1998-09-04", phStart: "2013-01-23", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Technology", industry: "Technology" },
  { name: "Amazon Web Services (AWS) Philippines", dateFounded: "1994-07-05", phStart: "2016-01-01", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Technology", industry: "Technology" },
  { name: "Starbucks Philippines", dateFounded: "1971-03-30", phStart: "1997-12-04", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Food & Beverages", industry: "Food & Beverage" },
  { name: "Toyota Motor Philippines", dateFounded: "1937-08-28", phStart: "1988-08-03", countryOfOrigin: "Japan", type: "Private Company", subDepartment: "Manufacturing", industry: "Automotive" },
  { name: "Mitsubishi Motors Philippines", dateFounded: "1917-04-22", phStart: "1963-02-20", countryOfOrigin: "Japan", type: "Private Company", subDepartment: "Manufacturing", industry: "Automotive" },
  { name: "Sony Philippines", dateFounded: "1946-05-07", phStart: "1996-01-01", countryOfOrigin: "Japan", type: "Private Company", subDepartment: "Manufacturing", industry: "Electronics" },
  { name: "Panasonic Manufacturing Philippines", dateFounded: "1918-03-07", phStart: "1963-05-29", countryOfOrigin: "Japan", type: "Private Company", subDepartment: "Manufacturing", industry: "Electronics" },
  { name: "Uniqlo Philippines (Fast Retailing)", dateFounded: "1949-03-01", phStart: "2012-06-15", countryOfOrigin: "Japan", type: "Private Company", subDepartment: "Retail", industry: "Retail & Apparel" },
  { name: "Samsung Electronics Philippines", dateFounded: "1969-01-13", phStart: "1998-01-01", countryOfOrigin: "South Korea", type: "Private Company", subDepartment: "Manufacturing", industry: "Electronics" },
  { name: "Hyundai Asia Resources, Inc.", dateFounded: "1967-12-29", phStart: "2001-08-01", countryOfOrigin: "South Korea", type: "Private Company", subDepartment: "Manufacturing", industry: "Automotive" },
  { name: "LG Electronics Philippines", dateFounded: "1958-10-01", phStart: "1988-01-01", countryOfOrigin: "South Korea", type: "Private Company", subDepartment: "Manufacturing", industry: "Electronics" },
  { name: "Nestlé Philippines", dateFounded: "1866-01-01", phStart: "1911-01-01", countryOfOrigin: "Switzerland", type: "Private Company", subDepartment: "Food & Beverages", industry: "Food & Beverage" },
  { name: "Unilever Philippines", dateFounded: "1929-09-02", phStart: "1927-01-01", countryOfOrigin: "United Kingdom", type: "Private Company", subDepartment: "Retail", industry: "Consumer Goods" },
  { name: "Shell Philippines", dateFounded: "1907-01-01", phStart: "1914-01-01", countryOfOrigin: "Netherlands", type: "Private Company", subDepartment: "Other", industry: "Energy & Utilities" },
  { name: "Bayer Philippines", dateFounded: "1863-08-01", phStart: "1962-01-01", countryOfOrigin: "Germany", type: "Private Company", subDepartment: "Other", industry: "Pharmaceuticals & Agribusiness" },
  { name: "AirAsia Philippines", dateFounded: "1993-12-20", phStart: "2010-12-01", countryOfOrigin: "Malaysia", type: "Private Company", subDepartment: "Travel & Hospitality", industry: "Aviation" },
  { name: "Petron Corporation", dateFounded: "1933-09-07", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Other", industry: "Energy & Utilities" },
  { name: "Puregold Price Club, Inc.", dateFounded: "1998-09-08", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Retail", industry: "Retail" },
  { name: "Robinsons Retail Holdings, Inc.", dateFounded: "1980-01-01", countryOfOrigin: "Philippines", type: "Private Company", subDepartment: "Retail", industry: "Retail" },
  { name: "Lazada Philippines", dateFounded: "2012-03-27", phStart: "2012-01-01", countryOfOrigin: "Singapore", type: "Private Company", subDepartment: "Technology", industry: "E-commerce" },
  { name: "Grab Philippines", dateFounded: "2012-01-01", phStart: "2013-01-01", countryOfOrigin: "Singapore", type: "Private Company", subDepartment: "Technology", industry: "Technology" },
  { name: "Shopee Philippines", dateFounded: "2015-01-01", phStart: "2015-01-01", countryOfOrigin: "Singapore", type: "Private Company", subDepartment: "Technology", industry: "E-commerce" },
  { name: "Huawei Philippines", dateFounded: "1987-01-01", phStart: "2002-01-01", countryOfOrigin: "China", type: "Private Company", subDepartment: "Technology", industry: "Technology" },
  { name: "Macquarie Group Philippines", dateFounded: "1969-01-01", phStart: "2006-01-01", countryOfOrigin: "Australia", type: "Private Company", subDepartment: "Finance", industry: "Banking & Finance" },
  { name: "Emirates Philippines", dateFounded: "1985-03-25", phStart: "1990-01-01", countryOfOrigin: "UAE", type: "Private Company", subDepartment: "Travel & Hospitality", industry: "Aviation" },

  // BPO & In-House
  { name: "Accenture Philippines", dateFounded: "1989-01-01", phStart: "1985-01-01", countryOfOrigin: "Ireland", type: "BPO/In-House", subDepartment: "IT Services", industry: "IT-BPM" },
  { name: "Teleperformance Philippines", dateFounded: "1978-01-01", phStart: "1996-01-01", countryOfOrigin: "France", type: "BPO/In-House", subDepartment: "Customer Support", industry: "IT-BPM" },
  { name: "Concentrix Philippines", dateFounded: "1983-01-01", phStart: "2007-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Customer Support", industry: "IT-BPM" },
  { name: "Telus International Philippines", dateFounded: "2005-01-01", phStart: "2001-01-01", countryOfOrigin: "Canada", type: "BPO/In-House", subDepartment: "Customer Support", industry: "IT-BPM" },
  { name: "Alorica Philippines", dateFounded: "1999-01-01", phStart: "2005-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Customer Support", industry: "IT-BPM" },
  { name: "Foundever (formerly Sitel)", dateFounded: "1985-01-01", phStart: "2000-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Customer Support", industry: "IT-BPM" },
  { name: "TaskUs Philippines", dateFounded: "2008-01-01", phStart: "2008-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Customer Support", industry: "IT-BPM" },
  { name: "Genpact Philippines", dateFounded: "1997-01-01", phStart: "2006-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Finance & Accounting", industry: "IT-BPM" },
  { name: "VXI Global Solutions Philippines", dateFounded: "1998-01-01", phStart: "2003-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Customer Support", industry: "IT-BPM" },
  { name: "IBEX Philippines", dateFounded: "2002-01-01", phStart: "2013-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Customer Support", industry: "IT-BPM" },
  { name: "Deutsche Bank (Philippines)", dateFounded: "1870-03-10", phStart: "1975-01-01", countryOfOrigin: "Germany", type: "BPO/In-House", subDepartment: "Finance & Accounting", industry: "Banking & Finance" },
  { name: "Wells Fargo Philippines", dateFounded: "1852-03-18", phStart: "2011-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Finance & Accounting", industry: "Banking & Finance" },
  { name: "Manulife Philippines", dateFounded: "1887-01-01", phStart: "1907-01-01", countryOfOrigin: "Canada", type: "BPO/In-House", subDepartment: "Finance & Accounting", industry: "Insurance" },
  { name: "Sun Life Philippines", dateFounded: "1865-01-01", phStart: "1895-01-01", countryOfOrigin: "Canada", type: "BPO/In-House", subDepartment: "Finance & Accounting", industry: "Insurance" },
  
  // Government Agencies
  { name: "Bangko Sentral ng Pilipinas (BSP)", dateFounded: "1993-07-03", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Department of Education (DepEd)", dateFounded: "1901-01-21", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Department of Health (DOH)", dateFounded: "1898-09-29", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Social Security System (SSS)", dateFounded: "1957-09-01", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Government Service Insurance System (GSIS)", dateFounded: "1936-11-14", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Philippine National Police (PNP)", dateFounded: "1991-01-29", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Security & Defense", industry: "Government & Public Sector" },
  { name: "Armed Forces of the Philippines (AFP)", dateFounded: "1897-03-22", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Security & Defense", industry: "Government & Public Sector" },
  { name: "Bureau of Internal Revenue (BIR)", dateFounded: "1904-08-01", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Civil Service Commission (CSC)", dateFounded: "1900-09-19", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Land Bank of the Philippines", dateFounded: "1963-08-08", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Banking & Finance" },
  { name: "Development Bank of the Philippines (DBP)", dateFounded: "1947-01-02", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Banking & Finance" },
  { name: "PAG-IBIG Fund (HDMF)", dateFounded: "1978-12-14", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Philippine Health Insurance Corporation (PhilHealth)", dateFounded: "1995-02-14", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Healthcare" },
  { name: "Department of Foreign Affairs (DFA)", dateFounded: "1898-06-23", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Department of Public Works and Highways (DPWH)", dateFounded: "1901-01-01", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Department of Trade and Industry (DTI)", dateFounded: "1981-01-01", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "National Economic and Development Authority (NEDA)", dateFounded: "1973-01-24", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Philippine Statistics Authority (PSA)", dateFounded: "2013-09-12", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Securities and Exchange Commission (SEC)", dateFounded: "1936-10-26", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Other Government Services", industry: "Government & Public Sector" },
  { name: "Philippine Coast Guard (PCG)", dateFounded: "1967-10-10", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Maritime & Seafarers", industry: "Government & Public Sector" },

  // NGOs & Other Organizations
  { name: "Philippine Red Cross", dateFounded: "1947-04-15", countryOfOrigin: "Philippines", type: "NGO", subDepartment: "Community Development", industry: "Humanitarian Aid" },
  { name: "Gawad Kalinga", dateFounded: "2003-10-04", countryOfOrigin: "Philippines", type: "NGO", subDepartment: "Community Development", industry: "Community Development" },
  { name: "Haribon Foundation", dateFounded: "1972-11-22", countryOfOrigin: "Philippines", type: "NGO", subDepartment: "Other", industry: "Environmental" },
  { name: "WWF-Philippines", dateFounded: "1961-04-29", phStart: "1997-02-13", countryOfOrigin: "Switzerland", type: "NGO", subDepartment: "Other", industry: "Environmental" },
  { name: "CARA Welfare Philippines", dateFounded: "2000-01-01", countryOfOrigin: "Philippines", type: "NGO", subDepartment: "Other", industry: "Animal Welfare" },
  { name: "Philippine Chamber of Commerce and Industry (PCCI)", dateFounded: "1978-07-01", countryOfOrigin: "Philippines", type: "Other", subDepartment: "Other", industry: "Business Association" },
  { name: "Makati Business Club (MBC)", dateFounded: "1981-01-01", countryOfOrigin: "Philippines", type: "Other", subDepartment: "Other", industry: "Business Association" },
  { name: "American Chamber of Commerce of the Philippines (AmCham)", dateFounded: "1920-01-01", countryOfOrigin: "USA", type: "Other", subDepartment: "Other", industry: "Business Association" },
  { name: "European Chamber of Commerce of the Philippines (ECCP)", dateFounded: "1978-01-01", countryOfOrigin: "Europe", type: "Other", subDepartment: "Other", industry: "Business Association" },
  { name: "University of the Philippines", dateFounded: "1908-06-18", countryOfOrigin: "Philippines", type: "Other", subDepartment: "Other", industry: "Education" },
  { name: "Ateneo de Manila University", dateFounded: "1859-12-10", countryOfOrigin: "Philippines", type: "Other", subDepartment: "Other", industry: "Education" },
  { name: "De La Salle University", dateFounded: "1911-06-16", countryOfOrigin: "Philippines", type: "Other", subDepartment: "Other", industry: "Education" },
  { name: "University of Santo Tomas", dateFounded: "1611-04-28", countryOfOrigin: "Philippines", type: "Other", subDepartment: "Other", industry: "Education" },
  { name: "Cultural Center of the Philippines (CCP)", dateFounded: "1966-06-25", countryOfOrigin: "Philippines", type: "Other", subDepartment: "Other", industry: "Arts & Culture" },
  { name: "Habitat for Humanity Philippines", dateFounded: "1976-01-01", phStart: "1988-01-01", countryOfOrigin: "USA", type: "NGO", subDepartment: "Community Development", industry: "Community Development" },
  { name: "Save the Children Philippines", dateFounded: "1919-01-01", phStart: "1981-01-01", countryOfOrigin: "United Kingdom", type: "NGO", subDepartment: "Community Development", industry: "Child Welfare" },
  { name: "World Vision Philippines", dateFounded: "1950-01-01", phStart: "1957-01-01", countryOfOrigin: "USA", type: "NGO", subDepartment: "Community Development", industry: "Humanitarian Aid" },
  { name: "UNICEF Philippines", dateFounded: "1946-12-11", phStart: "1948-01-01", countryOfOrigin: "USA", type: "NGO", subDepartment: "Community Development", industry: "Child Welfare" },
  
  // Brotherhoods, Fraternities, and Civic Orgs
  { name: "Alpha Phi Omega (Philippines)", dateFounded: "1925-12-16", phStart: "1950-03-02", countryOfOrigin: "USA", type: "Brotherhood", subDepartment: "Other", industry: "Fraternity" },
  { name: "Tau Gamma Phi", dateFounded: "1968-10-04", countryOfOrigin: "Philippines", type: "Brotherhood", subDepartment: "Other", industry: "Fraternity" },
  { name: "Alpha Kappa Rho", dateFounded: "1973-08-08", countryOfOrigin: "Philippines", type: "Brotherhood", subDepartment: "Other", industry: "Fraternity" },
  { name: "Scouts Royale Brotherhood", dateFounded: "1975-09-21", countryOfOrigin: "Philippines", type: "Brotherhood", subDepartment: "Other", industry: "Fraternity" },
  { name: "Rotary Club of Manila", dateFounded: "1905-02-23", phStart: "1919-06-01", countryOfOrigin: "USA", type: "Other", subDepartment: "Community Development", industry: "Civic Organization" },
  { name: "Lions Clubs International (Philippines)", dateFounded: "1917-06-07", phStart: "1949-01-01", countryOfOrigin: "USA", type: "Other", subDepartment: "Community Development", industry: "Civic Organization" },
  { name: "Kiwanis International Philippines", dateFounded: "1915-01-21", phStart: "1964-01-01", countryOfOrigin: "USA", type: "Other", subDepartment: "Community Development", industry: "Civic Organization" },
  { name: "JCI Philippines (Jaycees)", dateFounded: "1944-12-11", phStart: "1947-12-20", countryOfOrigin: "USA", type: "Other", subDepartment: "Community Development", industry: "Civic Organization" },
  { name: "The Most Worshipful Grand Lodge of Free and Accepted Masons of the Philippines", dateFounded: "1912-12-19", countryOfOrigin: "Philippines", type: "Brotherhood", subDepartment: "Other", industry: "Fraternal Organization" },

  // More Other Organizations
  { name: "IT & Business Process Association of the Philippines (IBPAP)", dateFounded: "2004-01-01", countryOfOrigin: "Philippines", type: "Other", subDepartment: "Other", industry: "Business Association" },
  { name: "Philippine Retailers Association (PRA)", dateFounded: "1976-01-01", countryOfOrigin: "Philippines", type: "Other", subDepartment: "Other", industry: "Business Association" },
  { name: "Management Association of the Philippines (MAP)", dateFounded: "1950-01-01", countryOfOrigin: "Philippines", type: "Other", subDepartment: "Other", industry: "Business Association" },

  // --- NEWLY ADDED DATA ---
  // Security & Defense
  { name: "Philippine Army", dateFounded: "1897-03-22", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Security & Defense", industry: "Military" },
  { name: "Philippine Navy", dateFounded: "1898-05-20", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Security & Defense", industry: "Military" },
  { name: "Philippine Air Force", dateFounded: "1947-07-01", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Security & Defense", industry: "Military" },
  { name: "Bureau of Fire Protection (BFP)", dateFounded: "1991-01-29", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Security & Defense", industry: "Public Safety" },
  { name: "Bureau of Jail Management and Penology (BJMP)", dateFounded: "1991-01-02", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Security & Defense", industry: "Corrections" },
  { name: "National Bureau of Investigation (NBI)", dateFounded: "1936-11-13", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Security & Defense", industry: "Law Enforcement" },

  // Maritime & Seafarers
  { name: "Maritime Industry Authority (MARINA)", dateFounded: "1974-06-01", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Maritime & Seafarers", industry: "Government & Public Sector" },
  { name: "Philippine Ports Authority (PPA)", dateFounded: "1975-07-11", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Maritime & Seafarers", industry: "Government & Public Sector" },
  { name: "Associated Marine Officers' and Seamen's Union of the Philippines (AMOSUP)", dateFounded: "1960-11-11", countryOfOrigin: "Philippines", type: "NGO", subDepartment: "Seafarers & Maritime Welfare", industry: "Union" },

  // Travel & Tourism
  { name: "Department of Tourism (DOT)", dateFounded: "1973-05-11", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Travel & Tourism", industry: "Government & Public Sector" },
  { name: "Bureau of Immigration (BI)", dateFounded: "1940-08-26", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Travel & Tourism", industry: "Government & Public Sector" },

  // Food & Beverages / Agriculture
  { name: "Department of Agriculture (DA)", dateFounded: "1898-06-23", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Food & Beverages / Agriculture", industry: "Government & Public Sector" },
  { name: "Bureau of Fisheries and Aquatic Resources (BFAR)", dateFounded: "1947-07-01", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Food & Beverages / Agriculture", industry: "Government & Public Sector" },
  { name: "Food and Drug Administration (FDA) Philippines", dateFounded: "1963-06-22", countryOfOrigin: "Philippines", type: "Government Agency", subDepartment: "Food & Beverages / Agriculture", industry: "Government & Public Sector" },
  { name: "KFC Philippines", dateFounded: "1930-09-24", phStart: "1966-01-01", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Food & Beverages", industry: "Food & Beverage" },
  { name: "Pizza Hut Philippines", dateFounded: "1958-06-15", phStart: "1984-01-01", countryOfOrigin: "USA", type: "Private Company", subDepartment: "Food & Beverages", industry: "Food & Beverage" },

  // Security Services (Private)
  { name: "G4S Philippines", dateFounded: "1901-01-01", phStart: "1965-01-01", countryOfOrigin: "United Kingdom", type: "Private Company", subDepartment: "Security Services", industry: "Security" },
  
  // More BPOs
  { name: "JPMorgan Chase & Co. (Philippines)", dateFounded: "1799-09-01", phStart: "1961-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Finance & Accounting", industry: "Banking & Finance" },
  { name: "24/7.ai Philippines", dateFounded: "2000-01-01", phStart: "2006-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Customer Support", industry: "IT-BPM" },
  { name: "Conduent Philippines", dateFounded: "2017-01-01", phStart: "2017-01-01", countryOfOrigin: "USA", type: "BPO/In-House", subDepartment: "Customer Support", industry: "IT-BPM" },

  // More NGOs
  { name: "Philippine Animal Welfare Society (PAWS)", dateFounded: "1954-01-01", countryOfOrigin: "Philippines", type: "NGO", subDepartment: "Other", industry: "Animal Welfare" },
  { name: "Angels of Hope Foundation Inc. (AHFI)", dateFounded: "2003-01-01", countryOfOrigin: "Philippines", type: "NGO", subDepartment: "Community Development", industry: "Child Welfare" }
];

    