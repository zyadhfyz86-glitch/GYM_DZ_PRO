const MEMBERS_KEY="gymdzpro_members_v1";
function getMembers(){try{return JSON.parse(localStorage.getItem(MEMBERS_KEY)||"[]")}catch{return[]}}
function saveMembers(members){localStorage.setItem(MEMBERS_KEY,JSON.stringify(members))}
