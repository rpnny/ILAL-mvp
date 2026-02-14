# Language Versions

ILAL documentation is primarily in **English** with Chinese translations for select documents.

---

## 📋 Document Language Matrix

### Primary Documents (English Only)

#### Core Documentation
- ✅ `README.md` - English
- ✅ `CONTRIBUTING.md` - English
- ✅ `SECURITY.md` - English
- ✅ `LICENSE` - English (MIT)

#### Technical Documentation
- ✅ `docs/guides/ARCHITECTURE.md` - English
- ✅ `docs/guides/DEPLOYMENT.md` - English
- ✅ `docs/api/CONTRACTS_API.md` - English
- ✅ `docs/GAS_EFFICIENCY_BENCHMARKS.md` - English
- ✅ `docs/testing/TEST_REPORT.md` - English
- ✅ `docs/security/INTERNAL_AUDIT_REPORT.md` - English

#### Business Documents
- ✅ `docs/outreach/ILAL_ONE_PAGER.md` - English
- ✅ `docs/outreach/ILAL_EXECUTIVE_BRIEF.md` - English
- ✅ `docs/outreach/BUG_BOUNTY.md` - English
- ✅ `docs/COMPETITIVE_ANALYSIS_EN.md` - English

---

### Bilingual Documents (English + Chinese)

| Document | English Version | Chinese Version |
|----------|----------------|-----------------|
| **README** | `README.md` | `README_CN.md` |
| **Executive Brief** | `docs/outreach/ILAL_EXECUTIVE_BRIEF.md` | `docs/outreach/ILAL_EXECUTIVE_BRIEF_CN.md` |
| **Outreach Guide** | `docs/outreach/OUTREACH_GUIDE.md` | `docs/outreach/OUTREACH_GUIDE_CN.md` |
| **Materials Index** | `docs/outreach/OUTREACH_MATERIALS_INDEX.md` | `docs/outreach/OUTREACH_MATERIALS_INDEX_CN.md` |
| **Reports Index** | `docs/reports/REPORTS_INDEX.md` | `docs/archives/chinese-reports/REPORTS_INDEX_CN.md` |
| **Competitive Analysis** | `docs/COMPETITIVE_ANALYSIS_EN.md` | `docs/COMPETITIVE_ANALYSIS.md` |

---

### Chinese-Only Documents (Internal/Historical)

Located in `docs/archives/chinese-reports/`:
- `ILAL_完整项目报告_2026-02-11.md` - Complete project report
- `ILAL_执行摘要_2026-02-11.md` - Executive summary (historical)
- `ILAL_项目报告_v2_2026-02-11.md` - Project report v2
- `ILAL_项目报告_v3_2026-02-11.md` - Project report v3
- `今日完成总结.md` - Daily completion summary

**Note**: These are historical internal documents and do not need English translation.

---

## 🌐 Language Policy

### English First
All **public-facing** and **external** documents must be in English:
- GitHub README
- API documentation
- User guides
- Security policies
- Contribution guidelines

### Chinese Supported
Chinese versions are provided for:
- Investor materials (Chinese market)
- Internal reports (team preference)
- Community materials (Chinese community)

### Translation Priority
When creating new documents:
1. **Write in English first** (primary language)
2. Translate to Chinese if:
   - Important for Chinese investors
   - Targeting Chinese market
   - Internal team documentation

---

## 📝 For Contributors

### Adding New Documentation

**If writing in English:**
- Name: `DOCUMENT_NAME.md`
- Location: Appropriate `docs/` subdirectory
- No language suffix needed

**If writing in Chinese:**
- Name: `DOCUMENT_NAME_CN.md`
- Location: Same directory as English version
- Add note in English doc: "Chinese version: DOCUMENT_NAME_CN.md"

**If translating existing document:**
- Keep English as `DOCUMENT_NAME.md`
- Add Chinese as `DOCUMENT_NAME_CN.md`
- Update this language index

---

## 🔍 Finding Documents

### English Documents
Most documents in the repository are in English. Look for:
- Files without `_CN` suffix
- Files with `_EN` suffix (when Chinese is primary)

### Chinese Documents
Look for:
- Files with `_CN` or `_cn` suffix
- Files in `docs/archives/chinese-reports/`
- `README_CN.md` in root

---

## 📊 Language Statistics

```
Total Documents: ~100 files
├── English only: ~80 files (80%)
├── Bilingual: ~10 files (10%)
└── Chinese only: ~10 files (10%)

Code Comments:
├── English: 100% (all code comments in English)
└── Chinese: 0%

User-Facing Content:
├── English: 100% (frontend, errors, etc.)
└── Chinese: Planned for i18n
```

---

## 🎯 Quick Reference

**Need to send to international audience?**
→ Use English versions (no `_CN` suffix)

**Need to send to Chinese audience?**
→ Use `_CN` versions if available, English otherwise

**Can't find English version?**
→ Check this file for guidance, or request translation

---

## 🔄 Translation Status

### ✅ Fully Translated
- Executive Brief
- README
- Outreach Guide
- Materials Index

### 🔄 Partially Translated
- Test reports (main reports in English, historical in Chinese)
- Competitive analysis (both available)

### ❌ Not Translated (Internal Only)
- Historical progress reports
- Daily summaries
- Internal meeting notes

---

## 📞 Translation Requests

Need a document translated?
1. Open an issue on GitHub
2. Label: `translation`
3. Specify: Which document and target language

We prioritize translations for:
- User-facing documentation
- Business materials
- Technical guides

---

## 🌍 Future Plans

### Planned Translations
- Japanese (for Japanese investors)
- Korean (for Korean market)
- Spanish (for Latin American expansion)

### Internationalization (i18n)
- Frontend UI in multiple languages
- Error messages localized
- Documentation in 3+ languages

---

**Default Language**: English  
**Secondary Language**: Chinese  
**Code/Comments**: English only  
**Public Docs**: English required, translations optional

---

**Questions?** Email: 2867755637@qq.com
