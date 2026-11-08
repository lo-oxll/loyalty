/* الإعدادات المشتركة بين index.html و admin.html */
(function(){
  "use strict";
  var DEFAULTS = {
    name: "اسم المطعم",
    tagline: "",
    logo: "",
    menu: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    phone: "",
    whatsapp: "",
    whatsappMessage: "مرحباً، أريد الطلب من القائمة",
    map: "",
    wifi: { name: "", password: "" },
    timezone: "Asia/Baghdad",
    hours: ["","","","","","",""]
  };
  var KEYS = ["name","tagline","logo","menu","instagram","facebook","tiktok","phone","whatsapp","whatsappMessage","map","timezone"];

  function merge(over){
    var o = JSON.parse(JSON.stringify(DEFAULTS));
    if(!over || typeof over !== "object") return o;
    KEYS.forEach(function(k){ if(typeof over[k] === "string") o[k] = over[k]; });
    if(over.wifi && typeof over.wifi === "object"){
      o.wifi = { name: String(over.wifi.name || ""), password: String(over.wifi.password || "") };
    }
    if(Array.isArray(over.hours) && over.hours.length === 7){
      o.hours = over.hours.map(function(h){ return typeof h === "string" ? h : ""; });
    }
    return o;
  }

  window.APP_CONFIG = { DATA_URL: "data.json", DEFAULTS: DEFAULTS, merge: merge };
})();
