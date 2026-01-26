export type Organization = {
  name: string;
  dateFounded: string; 
  type: "Private Companies" | "Government Agencies" | "Non-Government Organizations (NGOs)" | "Other Organizations";
};

export const anniversaryData: Organization[] = [
  // Private Companies
  { name: "San Miguel Corporation", dateFounded: "1890-09-29", type: "Private Companies" },
  { name: "Ayala Corporation", dateFounded: "1834-03-10", type: "Private Companies" },
  { name: "Jollibee Foods Corporation", dateFounded: "1978-01-28", type: "Private Companies" },
  { name: "SM Investments Corporation", dateFounded: "1958-01-01", type: "Private Companies" },
  { name: "PLDT Inc.", dateFounded: "1928-11-28", type: "Private Companies" },
  { name: "Globe Telecom", dateFounded: "1935-01-15", type: "Private Companies" },
  { name: "Meralco", dateFounded: "1903-03-24", type: "Private Companies" },
  { name: "Bank of the Philippine Islands (BPI)", dateFounded: "1851-08-01", type: "Private Companies" },
  { name: "Metrobank", dateFounded: "1962-09-05", type: "Private Companies" },
  { name: "Universal Robina Corporation", dateFounded: "1954-09-28", type: "Private Companies" },

  // Government Agencies
  { name: "Bangko Sentral ng Pilipinas (BSP)", dateFounded: "1993-07-03", type: "Government Agencies" },
  { name: "Department of Education (DepEd)", dateFounded: "1901-01-21", type: "Government Agencies" },
  { name: "Department of Health (DOH)", dateFounded: "1898-09-29", type: "Government Agencies" },
  { name: "Social Security System (SSS)", dateFounded: "1957-09-01", type: "Government Agencies" },
  { name: "Government Service Insurance System (GSIS)", dateFounded: "1936-11-14", type: "Government Agencies" },
  { name: "Philippine National Police (PNP)", dateFounded: "1991-01-29", type: "Government Agencies" },
  { name: "Armed Forces of the Philippines (AFP)", dateFounded: "1897-03-22", type: "Government Agencies" },
  { name: "Bureau of Internal Revenue (BIR)", dateFounded: "1904-08-01", type: "Government Agencies" },
  { name: "Civil Service Commission (CSC)", dateFounded: "1900-09-19", type: "Government Agencies" },
  { name: "Land Bank of the Philippines", dateFounded: "1963-08-08", type: "Government Agencies" },

  // NGOs
  { name: "Philippine Red Cross", dateFounded: "1947-04-15", type: "Non-Government Organizations (NGOs)" },
  { name: "Gawad Kalinga", dateFounded: "2003-10-04", type: "Non-Government Organizations (NGOs)" },
  { name: "Haribon Foundation", dateFounded: "1972-11-22", type: "Non-Government Organizations (NGOs)" },
  { name: "WWF-Philippines", dateFounded: "1997-02-13", type: "Non-Government Organizations (NGOs)" },
  { name: "CARA Welfare Philippines", dateFounded: "2000-01-01", type: "Non-Government Organizations (NGOs)" },

  // Other Organizations
  { name: "University of the Philippines", dateFounded: "1908-06-18", type: "Other Organizations" },
  { name: "Ateneo de Manila University", dateFounded: "1859-12-10", type: "Other Organizations" },
  { name: "De La Salle University", dateFounded: "1911-06-16", type: "Other Organizations" },
  { name: "University of Santo Tomas", dateFounded: "1611-04-28", type: "Other Organizations" },
  { name: "Cultural Center of the Philippines (CCP)", dateFounded: "1969-09-08", type: "Other Organizations" },
];
