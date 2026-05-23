/*
 * Offline Arabic → English business/ERP dictionary.
 *
 * Used by LanguageContext BEFORE the online translator, so common domain terms
 * translate instantly, correctly, and without a network round-trip (and without
 * mis-transliterations like "ج.م" → "JM"). The online engine remains the
 * fallback for anything not covered here.
 *
 * Organized by domain. Keep keys as the exact Arabic surface form.
 */

export const DICTIONARY_AR_EN = {
  /* ── Currency & money ── */
  "ج.م": "EGP", "ج": "EGP", "جنيه": "EGP", "جنيه مصري": "EGP",
  "ريال": "SAR", "ريال سعودي": "SAR", "درهم": "AED", "درهم إماراتي": "AED",
  "دينار": "KWD", "دولار": "USD", "يورو": "EUR", "جنيه إسترليني": "GBP",
  "نقدي": "Cash", "نقداً": "Cash", "آجل": "Credit", "تحويل بنكي": "Bank Transfer",
  "شيك": "Cheque", "محفظة": "Wallet", "فيزا": "Visa", "ماستركارد": "Mastercard",
  "رصيد": "Balance", "رصيد افتتاحي": "Opening Balance", "رصيد ختامي": "Closing Balance",
  "دائن": "Credit", "مدين": "Debit", "مديونية": "Debt", "ديون": "Debts",
  "مستحقات": "Receivables", "مستحق": "Due", "المتبقي": "Remaining", "الباقي": "Remaining",
  "المدفوع": "Paid", "المستلم": "Received", "المحصّل": "Collected", "تحصيل": "Collection",
  "سداد": "Payment", "دفعة": "Payment", "دفعة نقدية": "Cash Payment", "سلفة": "Advance",
  "خصم": "Discount", "خصم مباشر": "Direct Discount", "ضريبة": "Tax", "القيمة المضافة": "VAT",
  "الإقرار الضريبي": "Tax Filing", "قيمة الضريبة": "Tax Amount", "صافي": "Net", "إجمالي": "Total",

  /* ── Units of measure ── */
  "كجم": "kg", "كيلو": "kg", "كيلوجرام": "kg", "جرام": "g", "طن": "ton",
  "لتر": "L", "مليلتر": "mL", "متر": "m", "سم": "cm", "مم": "mm",
  "عدد": "pcs", "قطعة": "pcs", "قطع": "pcs", "وحدة": "unit", "صندوق": "box",
  "كرتونة": "carton", "شيكارة": "sack", "باكت": "pack", "بالتة": "pallet",
  "دستة": "dozen", "متر مربع": "m²", "متر مكعب": "m³", "ساعة": "hour", "يوم": "day",

  /* ── Core nav / modules ── */
  "لوحة التحكم": "Dashboard", "الرئيسية": "Home", "الوارد": "Purchases", "المشتريات": "Purchases",
  "المبيعات": "Sales", "بيع": "Sale", "شراء": "Purchase", "العملاء": "Clients", "العميل": "Client",
  "الموردون": "Suppliers", "المورد": "Supplier", "العمال": "Workers", "العامل": "Worker",
  "الموظفون": "Employees", "الموظف": "Employee", "المخزون": "Inventory", "المصروفات": "Expenses",
  "المصروف": "Expense", "التصنيع": "Manufacturing", "الإنتاج": "Production", "الخزينة": "Treasury",
  "اللوجستيات": "Logistics", "النقل": "Transport", "الموارد البشرية": "HR", "العلاقات": "CRM",
  "إدارة العملاء": "CRM", "الإحصائيات": "Statistics", "الإحصاء": "Statistics", "التقارير": "Reports",
  "الفواتير": "Invoices", "الفاتورة": "Invoice", "المهام": "Tasks", "الإعدادات": "Settings",
  "المنصة": "Platform", "الحساب": "Account", "الملف الشخصي": "Profile", "التكاملات": "Integrations",
  "الباقات": "Plans", "الاشتراك": "Subscription", "الفريق": "Team", "الصلاحيات": "Permissions",

  /* ── Common entity fields ── */
  "الاسم": "Name", "الاسم بالكامل": "Full Name", "الاسم المشترك": "Common Name",
  "الهاتف": "Phone", "رقم الهاتف": "Phone Number", "الموبايل": "Mobile", "البريد الإلكتروني": "Email",
  "العنوان": "Address", "المدينة": "City", "الدولة": "Country", "التاريخ": "Date", "الوقت": "Time",
  "النوع": "Type", "الفئة": "Category", "الصنف": "Item", "المنتج": "Product", "الوصف": "Description",
  "ملاحظات": "Notes", "الكمية": "Quantity", "السعر": "Price", "سعر الوحدة": "Unit Price",
  "سعر البيع": "Sale Price", "سعر الشراء": "Cost Price", "التكلفة": "Cost", "الوزن": "Weight",
  "الحالة": "Status", "الإجراءات": "Actions", "إجراء": "Action", "الرقم": "Number", "الكود": "Code",
  "الباركود": "Barcode", "المسلسل": "Serial", "الصورة": "Image", "الشعار": "Logo", "المرفقات": "Attachments",

  /* ── Actions / buttons ── */
  "إضافة": "Add", "جديد": "New", "تعديل": "Edit", "حذف": "Delete", "حفظ": "Save",
  "حفظ التعديلات": "Save Changes", "إلغاء": "Cancel", "إغلاق": "Close", "عرض": "View",
  "بحث": "Search", "تصفية": "Filter", "ترتيب": "Sort", "تحديث": "Refresh", "تصدير": "Export",
  "استيراد": "Import", "طباعة": "Print", "تنزيل": "Download", "رفع": "Upload", "مشاركة": "Share",
  "إرسال": "Send", "تأكيد": "Confirm", "موافق": "OK", "رجوع": "Back", "التالي": "Next",
  "السابق": "Previous", "إنشاء": "Create", "تفعيل": "Enable", "إيقاف": "Disable", "تعطيل": "Disable",
  "نسخ": "Copy", "لصق": "Paste", "تحديد": "Select", "تحديد الكل": "Select All", "نعم": "Yes", "لا": "No",
  "تسجيل الدخول": "Sign In", "تسجيل الخروج": "Logout", "إنشاء حساب": "Sign Up", "دخول": "Login",

  /* ── Statuses ── */
  "نشط": "Active", "غير نشط": "Inactive", "مفعّل": "Enabled", "معطّل": "Disabled",
  "موقوف": "Suspended", "محظور": "Banned", "معلّق": "Pending", "مكتمل": "Completed",
  "منتهي": "Done", "قيد التنفيذ": "In Progress", "مخطط": "Planned", "ملغي": "Cancelled",
  "مدفوع": "Paid", "غير مدفوع": "Unpaid", "جزئي": "Partial", "متأخر": "Overdue",
  "مسودة": "Draft", "مرسلة": "Sent", "مقبول": "Approved", "مرفوض": "Rejected",
  "مرتجع": "Returned", "تحت المراجعة": "Under Review", "حاضر": "Present", "غائب": "Absent",
  "في إجازة": "On Leave", "متوفر": "Available", "نفذ": "Out of Stock", "منخفض": "Low",

  /* ── CRM ── */
  "عميل محتمل": "Lead", "عملاء محتملون": "Leads", "تم التواصل": "Contacted", "مهتم": "Interested",
  "تعاقد": "Won", "خسرناه": "Lost", "متابعة": "Follow up", "فرصة": "Opportunity", "صفقة": "Deal",

  /* ── Manufacturing ── */
  "أمر إنتاج": "Production Order", "أوامر الإنتاج": "Production Orders", "قائمة المكونات": "BOM",
  "قوائم المكونات": "Bills of Materials", "المكونات": "Components", "المواد الخام": "Raw Materials",
  "منتج نهائي": "Finished Good", "نصف مصنّع": "Semi-Finished", "مركز عمل": "Work Center",
  "مراكز العمل": "Work Centers", "دفعة": "Batch", "دفعات": "Batches", "المخرجات": "Output",
  "تكلفة العمالة": "Labor Cost", "تكلفة إضافية": "Overhead", "تكلفة التصنيع": "Manufacturing Cost",
  "الهالك": "Waste", "نسبة الهالك": "Waste Rate", "الكفاءة": "Efficiency", "الطاقة الإنتاجية": "Capacity",

  /* ── HR / payroll ── */
  "الراتب": "Salary", "الرواتب": "Payroll", "الأجر": "Wage", "الأجور": "Wages",
  "بدل": "Allowance", "حافز": "Bonus", "خصم": "Deduction", "إجازة": "Leave",
  "إجازات": "Leaves", "الحضور": "Attendance", "الانصراف": "Check-out", "ساعات العمل": "Working Hours",
  "إضافي": "Overtime", "المسمى الوظيفي": "Job Title", "القسم": "Department", "تاريخ التعيين": "Hire Date",

  /* ── Treasury / finance ── */
  "إيداع": "Deposit", "سحب": "Withdrawal", "تحويل": "Transfer", "حركة": "Movement",
  "حركات": "Transactions", "الرصيد الحالي": "Current Balance", "السيولة": "Liquidity",
  "التدفق النقدي": "Cash Flow", "الأرباح": "Profit", "الخسائر": "Losses", "الربح": "Profit",
  "إجمالي الربح": "Gross Profit", "صافي الربح": "Net Profit", "الإيرادات": "Revenue",
  "الدخل": "Income", "المنصرف": "Expenses", "تسوية": "Settlement", "مقاصة": "Netting",
  "تصفير الحساب": "Settle Account", "كشف حساب": "Statement", "ميزانية": "Budget",

  /* ── Inventory ── */
  "أصناف المخزون": "Inventory Items", "الرصيد": "Stock", "حد التنبيه": "Reorder Point",
  "نقص المخزون": "Low Stock", "جرد": "Stock Count", "تسوية مخزون": "Stock Adjustment",
  "إضافة للمخزون": "Add Stock", "صرف من المخزون": "Issue Stock", "قيمة المخزون": "Inventory Value",
  "المستودع": "Warehouse", "المخزن": "Store", "الرف": "Shelf", "الموقع": "Location",

  /* ── Logistics ── */
  "مركبة": "Vehicle", "مركبات": "Vehicles", "سائق": "Driver", "رحلة": "Trip",
  "شحنة": "Shipment", "توصيل": "Delivery", "صيانة": "Maintenance", "وقود": "Fuel",
  "زيت": "Oil", "مخالفات": "Fines", "ترخيص": "License", "مسافة": "Distance",

  /* ── Reports / analytics ── */
  "تقرير": "Report", "تقرير عام": "General Report", "تقرير المبيعات": "Sales Report",
  "تقرير المشتريات": "Purchases Report", "تقرير المصروفات": "Expenses Report",
  "أفضل المنتجات": "Top Products", "أكبر العملاء": "Top Clients", "الأكثر مبيعاً": "Best Sellers",
  "اتجاه": "Trend", "نمو": "Growth", "انخفاض": "Decline", "مقارنة": "Comparison",
  "هذا الشهر": "This Month", "الشهر الماضي": "Last Month", "هذا العام": "This Year",
  "اليوم": "Today", "أمس": "Yesterday", "الأسبوع": "Week", "الشهر": "Month", "السنة": "Year",
  "من تاريخ": "From Date", "إلى تاريخ": "To Date", "الفترة": "Period", "المدى": "Range",

  /* ── Months & days ── */
  "يناير": "January", "فبراير": "February", "مارس": "March", "أبريل": "April",
  "مايو": "May", "يونيو": "June", "يوليو": "July", "أغسطس": "August",
  "سبتمبر": "September", "أكتوبر": "October", "نوفمبر": "November", "ديسمبر": "December",
  "السبت": "Saturday", "الأحد": "Sunday", "الاثنين": "Monday", "الثلاثاء": "Tuesday",
  "الأربعاء": "Wednesday", "الخميس": "Thursday", "الجمعة": "Friday",

  /* ── Roles / system ── */
  "مدير": "Admin", "مدير النظام": "System Admin", "المدير العام": "General Manager",
  "مالك": "Owner", "مستخدم": "User", "مستخدم جديد": "New User", "عضو": "Member",
  "مشاهد": "Viewer", "محاسب": "Accountant", "مندوب مبيعات": "Sales Rep",
  "عامل مخزن": "Warehouse Worker", "عامل إنتاج": "Production Worker", "صلاحية كاملة": "Full Access",
  "عرض فقط": "View Only", "وضع العرض": "View Mode", "الشركة": "Company", "شركة": "Company",
  "مساحة العمل": "Workspace", "فرع": "Branch", "فروع": "Branches",

  /* ── Generic words / phrases ── */
  "الكل": "All", "كل العملاء": "All Clients", "كل الموردين": "All Suppliers",
  "كل المنتجات": "All Products", "كل العمال": "All Workers", "عليهم دين": "Has Debt",
  "مسددون": "Settled", "لا توجد بيانات": "No data", "لا توجد نتائج": "No results",
  "جاري التحميل": "Loading", "جاري الحفظ": "Saving", "جاري التفكير": "Thinking",
  "تم بنجاح": "Success", "حدث خطأ": "An error occurred", "مطلوب": "Required",
  "اختياري": "Optional", "هذا الحقل مطلوب": "This field is required",
  "يجب أن يكون أكبر من صفر": "Must be greater than zero", "أدخل قيمة صحيحة": "Enter a valid value",
  "هل أنت متأكد؟": "Are you sure?", "لا يمكن التراجع": "This cannot be undone",
  "تأكيد الحذف": "Confirm Delete", "حذف نهائي": "Permanent Delete", "موجود بالفعل": "Already exists",
  "الإجمالي العام": "Grand Total", "المجموع الفرعي": "Subtotal", "متوسط": "Average",
  "أعلى": "Highest", "أقل": "Lowest", "العدد": "Count", "النسبة": "Percentage",
  "مرحباً": "Welcome", "أهلاً بعودتك": "Welcome back", "إلى اللقاء": "Goodbye",
  "شكراً": "Thank you", "من فضلك": "Please", "تنبيه": "Alert", "تحذير": "Warning",
  "معلومة": "Info", "نجاح": "Success", "فشل": "Failed", "خطأ": "Error",
};

/* Reverse map for English → Arabic (Arabic mode), built once. */
export const DICTIONARY_EN_AR = (() => {
  const out = {};
  for (const [ar, en] of Object.entries(DICTIONARY_AR_EN)) {
    if (!(en in out)) out[en] = ar; // first wins (most canonical)
  }
  return out;
})();
