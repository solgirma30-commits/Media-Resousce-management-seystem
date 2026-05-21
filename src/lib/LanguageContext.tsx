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
  },
  'order_no': {
    en: 'Order No',
    om: 'Lakkoofsa Ajajaa',
    am: 'የትዕዛዝ ቁጥር'
  },
  'requestor_dept': {
    en: 'Requestor Dept',
    om: 'Kutaa Hojii Gaafataa',
    am: 'ጠያቂ ክፍል'
  },
  'type_of_order': {
    en: 'Type of Order',
    om: 'Gosa Ajajaa',
    am: 'የትዕዛዝ አይነት'
  },
  'status_label': {
    en: 'Status',
    om: 'Haala Hojii',
    am: 'ሁኔታ'
  },
  'actions_label': {
    en: 'Actions',
    om: 'Tarkaanfiiwwan',
    am: 'እርምጃዎች'
  },
  'dept_requester': {
    en: 'Dept / Requester',
    om: 'Kutaa / Gaafataa',
    am: 'ክፍል / ጠያቂ'
  },
  'request_details': {
    en: 'Request Details',
    om: 'Ibsa Gaaffii',
    am: 'የጥያቄ ዝርዝር'
  },
  'schedule_label': {
    en: 'Schedule',
    om: 'Sa’aatii',
    am: 'መርሃግብር'
  },

  // Dynamic dashboard fields and components
  'dispatcher_control': {
    en: 'Dispatcher Control',
    om: 'To’annoo Ergitootaa',
    am: 'የመላኪያ መቆጣጠሪያ'
  },
  'system_control_unit': {
    en: 'System Control Unit',
    om: 'Kutaa To’annoo Sirnaa',
    am: 'የስርዓት ቁጥጥር ክፍል'
  },
  'bulk_setup_workforce': {
    en: 'Bulk Setup Workforce',
    om: 'Miseensota Hedduu Galmeessi',
    am: 'የስራ ኃይል በጅምላ ያዘጋጁ'
  },
  'add_workforce_member': {
    en: 'Add Workforce Member',
    om: 'Miseensa Hojii Dabali',
    am: 'የስራ ኃይል አባል ይጨምሩ'
  },
  'search_workforce': {
    en: 'Search workforce...',
    om: 'Hojjetoota barbaadi...',
    am: 'የስራ ኃይል ይፈልጉ...'
  },
  'dept_director_portal': {
    en: 'Dept Director Portal',
    om: 'Portaalii Daayirekteera Kutichaa',
    am: 'የስራ ክፍል ዳይሬክተር ፖርታል'
  },
  'FMC CAMERA PORTAL': {
    en: 'FMC CAMERA PORTAL',
    om: 'PORTAALII KAAMEERAA FMC',
    am: 'FMC የካሜራ ባለሙያ ፖርታል'
  },
  'FMC DRIVER PORTAL': {
    en: 'FMC DRIVER PORTAL',
    om: 'PORTAALII SHOFEERAA FMC',
    am: 'FMC የአሽከርካሪ ፖርታል'
  },
  'FMC ENGINEERS PORTAL': {
    en: 'FMC ENGINEERS PORTAL',
    om: 'PORTAALII INJINEROOTAA FMC',
    am: 'FMC የቴክኒሻን ፖርታል'
  },
  'Media & Event Coverage Node': {
    en: 'Media & Event Coverage Node',
    om: 'Funaansta Miidiyaa & Hojiiwwan Agarsiisaa',
    am: 'የሚዲያ እና ኩነት ዘገባ'
  },
  'Logistics & Transport Node': {
    en: 'Logistics & Transport Node',
    om: 'Geejjiba & Loojistikii',
    am: 'የትራንስፖርት እና ሎጂስቲክስ'
  },
  'Maintenance & Service Node': {
    en: 'Maintenance & Service Node',
    om: 'Hojiiwwan Suphaa & Tajaajilaa',
    am: 'የጥገና እና አገልግሎት'
  },
  'Work Description': {
    en: 'Work Description',
    om: 'Ibsa Hojii',
    am: 'የሥራ መግለጫ'
  },
  'Department': {
    en: 'Department',
    om: 'Kutaa Hojii',
    am: 'የሥራ ክፍል'
  },
  'Assigned Agent': {
    en: 'Assigned Agent',
    om: 'Agentii Ramadame',
    am: 'የተመደበው ወኪል'
  },
  'Timeline Link': {
    en: 'Timeline Link',
    om: 'Tarkaanfiiwwaan',
    am: 'የጊዜ ሰሌዳ'
  },
  'operational_control': {
    en: 'Operational Control',
    om: 'To’annoo Hojii',
    am: 'የስራ ማስኬጃ ቁጥጥር'
  },
  'initialize_service_request': {
    en: 'Initialize Service Request',
    om: 'Gaaffii Tajaajilaa Jalqabi',
    am: 'አዲስ የአገልግሎት ጥያቄ ይጀምሩ'
  },
  'request_camera_coverage': {
    en: 'Request Camera Coverage',
    om: 'Gaaffii Kaameeraa Jalqabi',
    am: 'የካሜራ ሽፋን ይጠይቁ'
  },
  'request_vehicle_assignment': {
    en: 'Request Vehicle Assignment',
    om: 'Gaaffii Konkolaataa Jalqabi',
    am: 'የተሽከርካሪ ምደባ ይጠይቁ'
  },
  'active_deployments': {
    en: 'Active Deployments',
    om: 'Boba’iinsa Hojii',
    am: 'ገቢር ስምሪቶች'
  },
  'new_operations': {
    en: 'New Operations',
    om: 'Hojii Haaraa',
    am: 'አዲስ ስራዎች'
  },
  'drafting_chamber': {
    en: 'Drafting Chamber',
    om: 'Kutaa Gaaffii Qopheessan',
    am: 'ጥያቄ ማዘጋጃ ክፍል'
  },
  'subject': {
    en: 'Subject',
    om: 'Dhimma',
    am: 'ርዕሰ ጉዳይ'
  },
  'description': {
    en: 'Description',
    om: 'Ibsa',
    am: 'መግለጫ'
  },
  'urgency': {
    en: 'Urgency',
    om: 'Ariifachiisummaa',
    am: 'አስቸኳይነት'
  },
  'location': {
    en: 'Location',
    om: 'Iddoo',
    am: 'ቦታ'
  },
  'asset_sn': {
    en: 'Asset S/N',
    om: 'Lakkoofsa addaa Meeshaa',
    am: 'የእቃው ሴሪያል ቁጥር'
  },
  'department': {
    en: 'Department',
    om: 'Kutaa Hojii',
    am: 'የስራ ክፍል'
  },
  'plate_number': {
    en: 'Plate Number',
    om: 'Lakkoofsa Gabeelaa',
    am: 'የሰሌዳ ቁጥር'
  },
  'mission_date': {
    en: 'Mission Date',
    om: 'Guyyaa Hojii',
    am: 'የስራ ቀን'
  },
  'technician_hub': {
    en: 'Technician Hub',
    om: 'Giddu-galeessa Teeknikaa',
    am: 'የቴክኒሻን ማዕከል'
  },
  'active_queue': {
    en: 'Active Queue',
    om: 'Maanduu Hojii',
    am: 'ንቁ የስራ ወረፋ'
  },
  'initialize_assignment': {
    en: 'Initialize Assignment',
    om: 'Hojii Jalqabi',
    am: 'ስራ ይጀምሩ'
  },
  'complete_assignment': {
    en: 'Complete Assignment',
    om: 'Hojii Xumuri',
    am: 'ስራውን ያጠናቅቁ'
  },
  'accept_assignment': {
    en: 'Accept Assignment',
    om: 'Hojii Fudhadhu',
    am: 'የተመደበውን ስራ ይቀበሉ'
  },
  'mark_in_progress': {
    en: 'Mark In-Progress',
    om: 'Gochaa Jira jedhi',
    am: 'በሂደት ላይ መሆኑን ያመልክቱ'
  },
  'finalize_resolve': {
    en: 'Finalize Resolve',
    om: 'Xumura Mirkaneessi',
    am: 'መጠናቀቁን ያረጋግጡ'
  },
  'assigned_agent': {
    en: 'Assigned Agent',
    om: 'Ogeessa Ramadame',
    am: 'የተመደበ ባለሙያ'
  },
  'select_task_from_assigned_list': {
    en: 'Select Task from Assigned List',
    om: 'Maanduu irraa Hojii Filadhu',
    am: 'ከተመደቡት ዝርዝር ውስጥ ስራ ይምረጡ'
  },
  'assigned_date': {
    en: 'Assigned Date',
    om: 'Guyyaa Kenname',
    am: 'የተመደበበት ቀን'
  },
  'service_request': {
    en: 'Service Request',
    om: 'Gaaffii Tajaajilaa',
    am: 'የአገልግሎት ጥያቄ'
  },
  'camera_request': {
    en: 'Camera Request',
    om: 'Gaaffii Kaameeraa',
    am: 'የካሜራ ጥያቄ'
  },
  'vehicle_request': {
    en: 'Vehicle Request',
    om: 'Gaaffii Konkolaataa',
    am: 'የተሽከርካሪ ጥያቄ'
  },
  'active_fleet': {
    en: 'Active Fleet',
    om: 'Gareen Hojii',
    am: 'ንቁ ተሽከርካሪዎች'
  },
  'workforce': {
    en: 'Workforce',
    om: 'Hojjetoota',
    am: 'የስራ ኃይል'
  },
  'weekly_report': {
    en: 'Weekly Report',
    om: 'Gabaasa Torbanii',
    am: 'ሳምንታዊ ሪፖርት'
  },
  'system_logs': {
    en: 'System Logs',
    om: 'Galmeewwan Sirnaa',
    am: 'የስርዓት ምዝግብ ማስታወሻዎች'
  },
  'assigned_to_agent': {
    en: 'Assigned to Agent',
    om: 'Ogeessaaf Kennameera',
    am: 'ለባለሙያ የተመደበ'
  },
  'status_assigned': {
    en: 'ASSIGNED',
    om: 'RAMADAMEERA',
    am: 'የተመደበ'
  },
  'status_accepted': {
    en: 'ACCEPTED',
    om: 'FUDHATAMEERA',
    am: 'የተቀበለ'
  },
  'status_in_progress': {
    en: 'IN_PROGRESS',
    om: 'HOJJATAMAA JIRA',
    am: 'በሂደት ላይ'
  },
  'status_completed': {
    en: 'COMPLETED',
    om: 'XUMURAMEERA',
    am: 'የተጠናቀቀ'
  },
  'status_closed': {
    en: 'CLOSED',
    om: 'CUFAMEERA',
    am: 'የተዘጋ'
  },
  'status_canceled': {
    en: 'CANCELED',
    om: 'HAQAAMEERA',
    am: 'የተሰረዘ'
  },
  'priority_critical': {
    en: 'Critical',
    om: 'Baay’ee Ariifachiisaa',
    am: 'እጅግ በጣም አስቸኳይ'
  },
  'priority_high': {
    en: 'High',
    om: 'Ol’aana',
    am: 'ከፍተኛ'
  },
  'priority_medium': {
    en: 'Medium',
    om: 'Giddu-galeessa',
    am: 'መካከለኛ'
  },
  'priority_low': {
    en: 'Low',
    om: 'Gadi-aana',
    am: 'ዝቅተኛ'
  },
  'fmc_engineer': {
    en: 'FMC ENGINEER',
    om: 'Injiinera FMC',
    am: 'የFMC መሐንዲስ'
  },
  'fmc_driver': {
    en: 'FMC DRIVER',
    om: 'Konkolaachisaa FMC',
    am: 'የFMC አሽከርካሪ'
  },
  'fmc_camera_operator': {
    en: 'FMC CAMERA OPERATOR',
    om: 'Meesha-Kaameeraa FMC',
    am: 'የFMC ካሜራ ኦፕሬተር'
  },
  'dispatch_title': {
    en: 'Dispatch',
    om: 'Eergi',
    am: 'ላክ (Dispatch)'
  },
  'work_assigned_title': {
    en: 'Work Assigned',
    om: 'Hojiin Kennameera',
    am: 'ስራ ተመድቧል'
  },
  // Priorities
  'LOW': {
    en: 'LOW',
    om: 'GAD-AANA',
    am: 'ዝቅተኛ'
  },
  'MEDIUM': {
    en: 'MEDIUM',
    om: 'GIDDU-GALEESSA',
    am: 'መካከለኛ'
  },
  'HIGH': {
    en: 'HIGH',
    om: 'OL-AANA',
    am: 'ከፍተኛ'
  },
  'URGENT': {
    en: 'URGENT',
    om: 'ARIIFACHIISAA',
    am: 'አስቸኳይ'
  },
  'URGENT_LOWER': {
    en: 'Urgent',
    om: 'Ariifachiisaa',
    am: 'አስቸኳይ'
  },
  // Categories
  'category_hardware': {
    en: 'Hardware',
    om: 'Haardweerii',
    am: 'ሀርድዌር'
  },
  'category_software': {
    en: 'Software',
    om: 'Softweerii',
    am: 'ሶፍትዌር'
  },
  'category_network': {
    en: 'Network',
    om: 'Netwoorkii',
    am: 'ኔትወርክ'
  },
  'category_electrical': {
    en: 'Electrical',
    om: 'Elektriika',
    am: 'ኤሌክትሪክ'
  },
  'category_furniture': {
    en: 'Furniture',
    om: 'Meesaalee Manbaa',
    am: 'የቤት እቃዎች (Furniture)'
  },
  'category_other': {
    en: 'Other',
    om: 'Kan biraa',
    am: 'ሌላ'
  },
  'category_others': {
    en: 'Others',
    om: 'Kan biraa',
    am: 'ሌሎች'
  },
  // Form Labels
  'lbl_service_category': {
    en: 'Service Category',
    om: 'Gosa Tajaajilaa',
    am: 'የአገልግሎት ዘርፍ'
  },
  'lbl_fleet_asset_optional': {
    en: 'Fleet Asset (Optional)',
    om: 'Konkolaataa (Yoo jiraate)',
    am: 'ተሽከርካሪ (አማራጭ)'
  },
  'lbl_priority_vector': {
    en: 'Priority Vector',
    om: 'Sadarkaa Ariifachiisummaa',
    am: 'የአስቸኳይነት ደረጃ'
  },
  'lbl_deployment_zone': {
    en: 'Deployment Zone',
    om: 'Iddoo Hojii',
    am: 'የስምሪት ቀጠና'
  },
  'lbl_communication_link': {
    en: 'Communication Link',
    om: 'Quunnamtii Bilbilaa',
    am: 'የመገናኛ ዘዴ'
  },
  'lbl_work_name_title': {
    en: 'Work Name / Title',
    om: 'Maqaa Hojii / Mataduree',
    am: 'የስራው ርዕስ / ስም'
  },
  'lbl_issue_specifications': {
    en: 'Issue Specifications',
    om: 'Ibsa Rakkoo',
    am: 'የችግሩ ዝርዝር መግለጫ'
  },
  'lbl_activity_job_name': {
    en: 'Activity / Job Name',
    om: 'Maqaa Hojii',
    am: 'የስራው አይነት / ስም'
  },
  'lbl_special_skills_laborer_type': {
    en: 'Special Skills / Laborer Type',
    om: 'Gosa Ogeessa Barbaadamu',
    am: 'የባለሙያ አይነት / ልዩ ችሎታ'
  },
  'lbl_number_of_laborers_needed': {
    en: 'Number of Laborers Needed',
    om: 'Baay’ina Hojjettoota Barbaadaman',
    am: 'የሚያስፈልገው የእለት ሰራተኞች ብዛት'
  },
  'lbl_work_date_year': {
    en: 'Work Date & Year',
    om: 'Guyyaa Hojii',
    am: 'የስራ ቀን እና አመት'
  },
  'lbl_work_start_time': {
    en: 'Work Start Time',
    om: 'Sa’aatii Jalqabaa',
    am: 'ስራ የሚጀምርበት ሰዓት'
  },
  'lbl_ending_time': {
    en: 'Ending Time',
    om: 'Sa’aatii Xumuraa',
    am: 'የማጠናቀቂያ ሰዓት'
  },
  'lbl_reason_for_request': {
    en: 'Reason for Request',
    om: 'Sababa Gaaffii',
    am: 'የጥያቄው ምክንያት'
  },
  'lbl_event_title': {
    en: 'Event Title',
    om: 'Maqaa Sagantaa',
    am: 'የኩነቱ ርዕስ'
  },
  'lbl_event_date': {
    en: 'Event Date',
    om: 'Guyyaa Sagantaa',
    am: 'የኩነቱ ቀን'
  },
  'lbl_start_time': {
    en: 'Start Time',
    om: 'Sa’aatii Jalqabaa',
    am: 'የመጀመሪያ ሰዓት'
  },
  'lbl_end_time': {
    en: 'End Time',
    om: 'Sa’aatii Xumuraa',
    am: 'የማለቂያ ሰዓት'
  },
  'lbl_purpose_equipment_needed': {
    en: 'Purpose / Equipment Needed',
    om: 'Kaayyoo / Meeshaa Barbaadamu',
    am: 'ዓላማ / የሚያስፈልገው መሳሪያ'
  },
  'lbl_trip_name_purpose_title': {
    en: 'Trip Name / Purpose Title',
    om: 'Kaayyoo Imalaa',
    am: 'የጉዞው ስም / ዓላማ'
  },
  'lbl_destination': {
    en: 'Destination',
    om: 'Iddoo Imalaa',
    am: 'መድረሻ'
  },
  'lbl_passengers': {
    en: 'Passengers',
    om: 'Imaltoota',
    am: 'ተጓዦች'
  },
  'lbl_departure_date': {
    en: 'Departure Date',
    om: 'Guyyaa Ka’iinsaa',
    am: 'የጉዞ መጀመሪያ ቀን'
  },
  'lbl_departure_time': {
    en: 'Departure Time',
    om: 'Sa’aatii Ka’iinsaa',
    am: 'የጉዞ መጀመሪያ ሰዓት'
  },
  'lbl_estimated_return': {
    en: 'Estimated Return',
    om: 'Sa’aatii Deebii',
    am: 'የመመለሻ ግምታዊ ሰዓት'
  },
  'lbl_purpose_of_trip': {
    en: 'Purpose of Trip',
    om: 'Kaayyoo Imala Hojii',
    am: 'የጉዞው ዓላማ'
  },
  'lbl_item_name_model': {
    en: 'Item Name / Model',
    om: 'Gosa Meeshaa / Moodela',
    am: 'የዕቃው ስም / ሞዴል'
  },
  'lbl_serial_number_asset_tag': {
    en: 'Serial Number / Asset Tag',
    om: 'Lakk. Addaa Meeshaa',
    am: 'የሴሪያል ቁጥር / መለያ ምልክት'
  },
  'lbl_quantity': {
    en: 'Quantity',
    om: 'Baay’ina',
    am: 'ብዛት'
  },
  'lbl_responsible_for_item': {
    en: 'Responsible for Item',
    om: 'Nama Itti-gaafatamu',
    am: 'ዕቃውን በኃላፊነት የሚይዘው ሰው'
  },
  'lbl_expected_return_date_optional': {
    en: 'Expected Return Date (Optional)',
    om: 'Guyyaa Deebii (Yoo jiraate)',
    am: 'የመመለሻ ቀን (አማራጭ)'
  },
  'lbl_reason_for_exit': {
    en: 'Reason for Exit',
    om: 'Sababa Ba’iinsaa',
    am: 'ለመውጣት ምክንያት'
  },
  // Admin Form labels
  'lbl_recipient_identity': {
    en: 'Recipient Identity',
    om: 'Eenyummaan Nama Fudhatuu',
    am: 'የተቀባዩ ማንነት'
  },
  'lbl_directive_payload': {
    en: 'Directive Payload',
    om: 'Ergaa Hojii',
    am: 'የመመሪያ መረጃ'
  },
  'lbl_name': {
    en: 'Name',
    om: 'Maqaa',
    am: 'ስም'
  },
  'lbl_contact_phone_no': {
    en: 'Contact Phone No',
    om: 'Lakkoofsa Bilbilaa',
    am: 'የስልክ ቁጥር'
  },
  'lbl_operational_role': {
    en: 'Operational Role',
    om: 'Gahee Hojii',
    am: 'የስራ ድርሻ'
  },
  'lbl_user_name': {
    en: 'User Name',
    om: 'Maqaa Fayyadamaa',
    am: 'የተጠቃሚ ስም'
  },
  'lbl_agent_contact_sms': {
    en: 'Agent Contact (SMS)',
    om: 'Quunnamtii Teeknikaa (SMS)',
    am: 'የቴክኒሻን አድራሻ (SMS)'
  },
  'lbl_carrier_responsible': {
    en: 'Carrier / Responsible',
    om: 'Nama Fudhatu / Itti-gaafatamaa',
    am: 'አጓጓዥ / ተጠያቂ'
  },
  'lbl_laborer_type_specialty': {
    en: 'Laborer Type / Specialty',
    om: 'Gosa Hojjetaa',
    am: 'የቀን ሰራተኛ አይነት'
  },
  'lbl_laborer_count_quantity': {
    en: 'Laborer Count (Quantity)',
    om: 'Baay’ina Hojjetootaa',
    am: 'የሰራተኞች ብዛት'
  },
  'lbl_work_date': {
    en: 'Work Date',
    om: 'Guyyaa Hojii',
    am: 'የሥራ ቀን'
  },
  // Placeholders
  'ph_comments': {
    en: 'Add your comments or feedback on the completed work...',
    om: 'Yaada keessan hojicharratti dabaladhaa...',
    am: 'ስለተጠናቀቀው ስራ አስተያየትዎን እዚህ ያስፍሩ...'
  },
  'ph_location_id': {
    en: 'Location ID',
    om: 'Lakk. Iddoo',
    am: 'የቦታ መለያ (Location ID)'
  },
  'ph_direct_phone': {
    en: 'Direct phone',
    om: 'Lakkoofsa Bilbilaa',
    am: 'ቀጥታ ስልክ መስመር'
  },
  'ph_office_ac_repair': {
    en: 'e.g., Office AC Repair',
    om: 'Fakkeenyaaf, Suphaa Kilaayimeetii',
    am: 'ምሳሌ፦ የቢሮ ኤሲ ጥገና'
  },
  'ph_technical_descriptors': {
    en: 'Provide technical descriptors...',
    om: 'Ibsa teeknikaa dabaladhaa...',
    am: 'ቴክኒካዊ መግለጫዎችን ያስገቡ...'
  },
  'ph_define_work_project': {
    en: 'Define work or project name',
    om: 'Maqaa Hojii ykn Pirojekti',
    am: 'የስራውን ወይም የፕሮጀክቱን ስም ይግለጹ'
  },
  'ph_laborer_specialty': {
    en: 'e.g. Mason, Welder, Assistant, General Hand',
    om: 'Fakkeenyaaf, Dhaga-baxxi, Welder, Gargaaraa',
    am: 'ምሳሌ፦ ግንበኛ፣ ብየዳ፣ ረዳት፣ አጠቃላይ ሰራተኛ'
  },
  'ph_laborers_scope': {
    en: 'Explain scope of work and reason for laborers request',
    om: 'Hojichaafi sababa hojjettoonni barbaadaman ibsi',
    am: 'የስራውን ይዘት እና የቀን ሰራተኞች ያስፈለጉበትን ምክንያት ያብራሩ'
  },
  'ph_event_title': {
    en: 'Event name or project title',
    om: 'Maqaa Sagantichaa',
    am: 'የኩነቱ ወይም የፕሮጀክቱ ስም'
  },
  'ph_location': {
    en: 'Location',
    om: 'Iddoo',
    am: 'ቦታ'
  },
  'ph_coverage_requirements': {
    en: 'Explain coverage requirements...',
    om: 'Ibsoota dabalataa barreessi...',
    am: 'የካሜራ ሽፋን ፍላጎቶችን ያብራሩ...'
  },
  'ph_inspection_trip': {
    en: 'e.g., Site Inspection Trip',
    om: 'Fakkeenyaaf, Daawwannaa Dirree',
    am: 'ምሳሌ፦ የመስክ ምልከታ ጉዞ'
  },
  'ph_destination': {
    en: 'Trip destination',
    om: 'Iddoo deeman',
    am: 'የጉዞው መድረሻ'
  },
  'ph_mission_details': {
    en: 'Explain mission details...',
    om: 'Ibsa imalichaa dabaladhaa...',
    am: 'የጉዞውን ዝርዝር ሁኔታ ያብራሩ...'
  },
  'ph_item_name': {
    en: 'e.g., Dell Laptop XPS 15',
    om: 'Fakkeenyaaf, Laptop Dell',
    am: 'ምሳሌ፦ ዴል ላፕቶፕ ኤክስፒኤስ 15'
  },
  'ph_serial_number': {
    en: 'e.g., S/N 12345678',
    om: 'Fakkeenyaaf, Lakk Addaa',
    am: 'ምሳሌ፦ S/N 12345678'
  },
  'ph_quantity_eg': {
    en: 'e.g., 1',
    om: 'Fakkeenyaaf, 1',
    am: 'ምሳሌ፦ 1'
  },
  'ph_responsible_person': {
    en: 'Name of person responsible',
    om: 'Maqaa nama fashaleessu',
    am: 'ዕቃውን በኃላፊነት የሚይዘው ሰው ስም'
  },
  'ph_exit_reason_explain': {
    en: 'Explain why this item is leaving the premises...',
    om: 'Meeshaan kun maaliif akka ba’u ibsi...',
    am: 'ዕቃው ከግቢው የሚወጣበትን ምክንያት ያብራሩ...'
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
    const cleanKey = (key || '').trim();
    const cleanDefault = (defaultVal || '').trim();
    
    // 1. Direct key match in language dictionary
    let entry = translationDictionary[cleanKey];
    if (entry && entry[language]) {
      return entry[language];
    }
    
    // 2. Default value direct key match
    if (cleanDefault) {
      entry = translationDictionary[cleanDefault];
      if (entry && entry[language]) {
        return entry[language];
      }
    }

    // 3. Reverse text matching (checks if English string exists in entries)
    const targetText = cleanDefault || cleanKey;
    if (targetText) {
      const foundEntry = Object.values(translationDictionary).find(
        (item) => item.en && item.en.toLowerCase() === targetText.toLowerCase()
      );
      if (foundEntry && foundEntry[language]) {
        return foundEntry[language];
      }
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
