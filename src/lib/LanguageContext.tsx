import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'om' | 'am';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultVal?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const translationDictionary: Record<string, Record<Language, string>> = {
  // Navigation & Layout
  'nav_dashboard': {
    en: 'Dashboard Overview',
    om: 'Iddoo Daashboordii',
    am: 'የዳሽቦርድ አጠቃላይ እይታ'
  },
  'nav_requests': {
    en: 'Service Requests',
    om: 'Gaaffilee Tajaajilaa',
    am: 'የአገልግሎት ጥያቄዎች'
  },
  'nav_service_queue': {
    en: 'Service Queue',
    om: 'Tarree Tajaajilaa',
    am: 'የአገልግሎት ወረፋ'
  },
  'nav_technician_fleet': {
    en: 'Technician Fleet',
    om: 'Gareen Teeknikaa',
    am: 'የቴክኒሻን ቡድን'
  },
  'nav_technicians': {
    en: 'Technicians',
    om: 'Ogeeyyii Teeknikaa',
    am: 'ቴክኒሻኖች'
  },
  'nav_notifications': {
    en: 'Notifications',
    om: 'Beeksisa',
    am: 'ማሳወቂያዎች'
  },
  'nav_system_alerts': {
    en: 'System Alerts',
    om: 'Akeekkachiisa Sirnaa',
    am: 'የስርዓት ማንቂያዎች'
  },
  'nav_clear_all': {
    en: 'Clear All',
    om: 'Hunda Haqi',
    am: 'ሁሉንም አጽዳ'
  },
  'nav_no_notifications': {
    en: 'No pending notifications',
    om: 'Beeksisi hafe hin jiru',
    am: 'ምንም ማሳወቂያ የለም'
  },
  'system_health': {
    en: 'SYSTEM HEALTH',
    om: 'FAYYAA SIRNAA',
    am: 'የስርዓት ጤና'
  },
  'enable_alerts': {
    en: 'Enable Alerts',
    om: 'Akeekkachiisa Garsiisi',
    am: 'ማንቂያዎችን አግብር'
  },
  'test_alert': {
    en: 'Test Alert',
    om: 'Akeekkachiisa Yaali',
    am: 'ማንቂያ ሙከራ'
  },
  'all_servers_operational': {
    en: 'All servers operational',
    om: 'Sarvaroonni hundi ni hojjetu',
    am: 'ሁሉም ሰርቨሮች በስራ ላይ ናቸው'
  },
  'switch_portal': {
    en: 'Switch Portal',
    om: 'Portaalii Jijjiiri',
    am: 'ፖርታል ቀይር'
  },
  'sign_out': {
    en: 'Sign Out',
    om: 'Ba’i',
    am: 'ውጣ (Sign Out)'
  },
  'portal_selection': {
    en: 'Portal Selection',
    om: 'Filannoo Portaali',
    am: 'ፖርታል መምረጫ'
  },
  'system_context': {
    en: 'SYSTEM CONTEXT',
    om: 'HAALA SIRNAA',
    am: 'የስርዓት ሁኔታ'
  },
  'portal': {
    en: 'PORTAL',
    om: 'PORTAALII',
    am: 'ፖርታል'
  },

  // Login Terminal
  'login_security_terminal': {
    en: 'Security Terminal',
    om: 'Terminaala Nageenyaa',
    am: 'የደህንነት ተርሚናል'
  },
  'login_system_online': {
    en: 'System Online',
    om: 'Sirni Hojii Irra Jira',
    am: 'ስርዓቱ በመስመር ላይ ነው'
  },
  'login_access_node': {
    en: 'Access Point',
    om: 'Iddoo Seensaa',
    am: 'የመግቢያ ነጥብ'
  },
  'login_secure_access_point': {
    en: 'Secure Access Point',
    om: 'Iddoo Seensa Eegumsa Qabu',
    am: 'ደህንነቱ የተጠበቀ የመግቢያ ነጥብ'
  },
  'login_welcome_msg': {
    en: 'Welcome to the Field Management Center. Please authenticate using your official credentials to access the operational vector.',
    om: 'Gara Maanduu Bulchiinsa Dirree (FMC) tiin baga nagaan dhuftan. Oolmaa hojii jalqabuuf ragaa keessaniin mirkaneessaa.',
    am: 'እንኳን ወደ የመስክ አስተዳደር ማዕከል (FMC) በደህና መጡ። እባክዎን ወደ ስራው ለመግባት ይፋዊ መታወቂያዎን ያረጋግጡ።'
  },
  'login_authenticate_google': {
    en: 'Authenticate with Google',
    om: 'Google’n Of Mirkaneessi',
    am: 'በGoogle ያረጋግጡ'
  },
  'login_waiting_handshake': {
    en: 'Connection secure. Waiting for biometric handshake...',
    om: 'Quunnamtiin eegumsa qaba. Harka-fudhatti eeggachaa jira...',
    am: 'ግንኙነቱ አስተማማኝ ነው። ባዮሜትሪክ ንክኪ በመጠባበቅ ላይ...'
  },
  'login_official_fmc_terminal': {
    en: 'Official FMC Terminal',
    om: 'Terminaala FMC Seeraa',
    am: 'ይፋዊ የFMC ተርሚናል'
  },

  // Role Setup & Identity
  'role_resource_mgmt': {
    en: 'FMC RESOURCE MANAGEMENT',
    om: 'BULCHIINSA QABEENYA FMC',
    am: 'የFMC ሀብት አስተዳደር'
  },
  'role_define_role': {
    en: 'Define your operational role within the TechFlow ecosystem',
    om: 'Sirna TechFlow keessatti gahee hojii keessan adda baasaa',
    am: 'በTechFlow ስርዓት ውስጥ የስራ ድርሻዎን ይግለጹ'
  },
  'role_user_name': {
    en: 'User Name',
    om: 'Maqaa Fayyadamaa',
    am: 'የተጠቃሚ ስም'
  },
  'role_contact_password': {
    en: 'Password / Contact Number',
    om: 'Lakkoofsa Bilbilaa / Lakk-Iccitii',
    am: 'ስልክ ቁጥር / የይለፍ ቃል'
  },
  'role_dept_label': {
    en: 'Operational Department',
    om: 'Kutaa Hojii (Department)',
    am: 'የስራ ክፍል (Department)'
  },
  'role_init_portal': {
    en: 'Initialize Portal',
    om: 'Portaalii Jalqabi',
    am: 'ፖርታል አስጀምር'
  },
  'role_discard_changes': {
    en: 'Discard Changes',
    om: 'Dhiisi',
    am: 'ለውጦችን ሰርዝ'
  },
  'fmc_admin': {
    en: 'FMC ADMIN',
    om: 'BULCHAA FMC',
    am: 'FMC አስተዳዳሪ'
  },
  'fmc_request': {
    en: 'FMC REQUEST',
    om: 'GAAPHILEESSAA FMC',
    am: 'FMC ጠያቂ'
  },
  'fmc_engineers': {
    en: 'FMC ENGINEERS',
    om: 'OOGEYYII FMC',
    am: 'FMC መሐንዲሶች'
  },
  'fmc_drivers': {
    en: 'FMC DRIVERS',
    om: 'KONKOLAATTISTOOTA FMC',
    am: 'FMC አሽከርካሪዎች'
  },
  'fmc_cameramen': {
    en: 'FMC CAMERA OPERATORS',
    om: 'KAAMEERAALESSITOOTA FMC',
    am: 'FMC ካሜራ ባለሙያዎች'
  },
  'fmc_security': {
    en: 'FMC SECURITY',
    om: 'TIGGISTOOTA FMC',
    am: 'FMC ደህንነት'
  },

  // Security Checkpoint Dashboard
  'sec_checkpoint_title': {
    en: 'Security Checkpoint',
    om: 'Buufata To’annoo Nageenyaa',
    am: 'የደህንነት ቁጥጥር ኬላ'
  },
  'sec_active_exit_vectors': {
    en: 'Approved Item Clearance Registry',
    om: 'Galmee Hayyama Fashalaa Meeshaalee',
    am: 'የተፈቀዱ እቃዎች መውጫ መዝገብ'
  },
  'sec_checkpoint_active': {
    en: 'Checkpoint Active',
    om: 'To’annoon Hojii Irra Jira',
    am: 'ቁጥጥር ላይ ነው'
  },
  'sec_exit_clearance_no': {
    en: 'Clearance No',
    om: 'Lakkoofsa Mirkaneessaa',
    am: 'የፈቃድ ቁጥር'
  },
  'sec_item_description': {
    en: 'Item & Department',
    om: 'Meeshaa fi Kutaa',
    am: 'እቃ እና የስራ ክፍል'
  },
  'sec_responsible_person': {
    en: 'Carrier Personnel',
    om: 'Nama Meeshaa Baasu',
    am: 'እቃውን የሚይዘው ተጠቃሚ'
  },
  'sec_exit_status': {
    en: 'Exit Status',
    om: 'Haala Ba’iinsaa',
    am: 'የመውጫ ሁኔታ'
  },
  'sec_action_trigger': {
    en: 'Verification Controls',
    om: 'To’annoo Mirkaneessaa',
    am: 'የማረጋገጫ መቆጣጠሪያዎች'
  },
  'sec_gate_out': {
    en: 'Verify Gate-Out',
    om: 'Ba’iinsa Mirkaneessi',
    am: 'መውጫውን አረጋግጥ'
  },
  'sec_gate_in': {
    en: 'Verify Return/Gate-In',
    om: 'Deebii Mirkaneessi',
    am: 'መመለሱን አረጋግጥ'
  },
  'sec_authorized': {
    en: 'AUTHORIZED',
    om: 'HEYYAMAMEERA',
    am: 'የተፈቀደ'
  },
  'sec_gate_out_success': {
    en: 'EXITS RECORDED',
    om: 'BA’IINSI GALMAA’EERA',
    am: 'መውጫው ተመዝግቧል'
  },
  'sec_returned_success': {
    en: 'RETURNED COMPLETE',
    om: 'DEEBII GALMAA’EERA',
    am: 'መመለሱ ተረጋግጧል'
  },
  'sec_security_protocol': {
    en: 'Security Protocol',
    om: 'Pirtokoolii Nageenyaa',
    am: 'የደህንነት ደንብ (Protocol)'
  },
  'sec_protocol_1': {
    en: 'Match Item Name and S/N with physical asset before release.',
    om: 'Gosa meeshaa fi lakk-addaa meeshaa qaaman wal-bira qabi.',
    am: 'ከመልቀቅዎ በፊት የእቃውን ስም እና ሴሪያል ቁጥር በአካል ካለው እቃ ጋር ያመሳክሩ።'
  },
  'sec_protocol_2': {
    en: 'Verify operational approval status in system before gate-out.',
    om: 'Eeyyama ba’iinsaa sirna keessaa osoo hin ba’in dura mirkaneessi.',
    am: 'ከመውጣቱ በፊት በስርዓቱ ውስጥ የጸደቀበትን ሁኔታ ያረጋግጡ።'
  },
  'sec_protocol_3': {
    en: 'Ensure personnel identity matches the system assignment.',
    om: 'Eenyummaan nama sanaa ragaa sirnaa waliin walitti dhufuu isaa mirkaneessi.',
    am: 'የተጠቃሚው ማንነት በስርዓቱ ውስጥ ከተመደበው ተጠቃሚ ጋር መመሳሰሉን ያረጋግጡ።'
  },

  // Search places
  'search_active_clearance': {
    en: 'Search active exit approvals...',
    om: 'Mirkaneessoota ba’iinsaa barbaadi...',
    am: 'ንቁ የመውጫ ፈቃዶችን ፈልግ...'
  },
  'no_clearance_records': {
    en: 'No active item exit clearances matching query.',
    om: 'Ragaan hayyama ba’iinsaa hin jiru.',
    am: 'ከተሰጠው ቃል ጋር የሚዛመድ የመውጫ ፈቃድ አልተገኘም።'
  },

  // Common buttons & states
  'btn_back': {
    en: 'Back',
    om: 'Duubatti',
    am: 'ተመለስ'
  },
  'btn_close': {
    en: 'Close',
    om: 'Cufi',
    am: 'ዝጋ'
  },
  'btn_cancel': {
    en: 'Cancel',
    om: 'Dhiisi',
    am: 'ሰርዝ'
  },
  'btn_confirm': {
    en: 'Confirm',
    om: 'Mirkaneessi',
    am: 'አረጋግጥ'
  },
  'btn_approve': {
    en: 'Approve',
    om: 'Mirkaneessi',
    am: 'አጽድቅ'
  },
  'btn_reject': {
    en: 'Reject',
    om: 'Haali',
    am: 'ውድቅ አድርግ'
  },
  'status_pending': {
    en: 'Pending',
    om: 'Eeggannoo irra',
    am: 'በመጠባበቅ ላይ'
  },
  'status_approved': {
    en: 'Approved',
    om: 'Mirkanaa’e',
    am: 'የጸደቀ'
  },
  'status_rejected': {
    en: 'Rejected',
    om: 'Kufaa Ta’e',
    am: 'ውድቅ የተደረገ'
  },
  'loading_data': {
    en: 'Securing data pipelines...',
    om: 'Quunnamtii eegumsa qabu to’achaa jira...',
    am: 'መረጃ በመጫን ላይ...'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved === 'en' || saved === 'om' || saved === 'am') {
      return saved as Language;
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
  };

  const t = (key: string, defaultVal?: string): string => {
    const entry = translationDictionary[key];
    if (entry && entry[language]) {
      return entry[language];
    }
    return defaultVal !== undefined ? defaultVal : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
