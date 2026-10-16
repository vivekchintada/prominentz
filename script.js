// ── Prominentz Landing Page Vanilla JS ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const hamburger = document.getElementById('hamburger')
  const drawer = document.getElementById('nav-drawer')

  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open')
      hamburger.setAttribute('aria-expanded', isOpen)
      drawer.setAttribute('aria-hidden', !isOpen)
    })

    // Close drawer when clicking any link
    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open')
        hamburger.setAttribute('aria-expanded', 'false')
        drawer.setAttribute('aria-hidden', 'true')
      })
    })
  }

  // 2. Interactive Savings Calculator
  const revInput = document.getElementById('calc-revenue')
  const termInput = document.getElementById('calc-terminals')
  const revVal = document.getElementById('calc-rev-val')
  const termVal = document.getElementById('calc-term-val')
  const savingsTotal = document.getElementById('calc-savings-total')
  const legacyTotal = document.getElementById('calc-legacy-total')
  const revBtns = document.querySelectorAll('.calc-btn')
  const termBtns = document.querySelectorAll('.calc-btn-term')

  function updateSavings() {
    if (!revInput || !termInput) return

    const revenue = Number(revInput.value)
    const terminals = Number(termInput.value)

    if (revVal) revVal.textContent = `$${revenue.toLocaleString()} / mo`
    if (termVal) termVal.textContent = `${terminals} Screens`

    // Prominentz: $50/mo * 12 = $600/yr
    const prominentzAnnual = 50 * 12

    // Legacy POS calculation:
    // Base software: $110/mo
    // Extra terminals: $65/mo per terminal over 1
    // KDS screens: $45/mo per screen (roughly 1 screen per 2 terminals, min 1)
    // QR / Online ordering add-on: $75/mo
    // 0.45% hidden take-rate / processing fee markup
    const kdsScreens = Math.max(1, Math.round(terminals / 2))
    const legacyBase = 110 * 12
    const legacyTerminals = Math.max(0, terminals - 1) * 65 * 12
    const legacyKds = kdsScreens * 45 * 12
    const legacyQr = 75 * 12
    const legacyTakeRate = revenue * 12 * 0.0045

    const legacySum = Math.round(legacyBase + legacyTerminals + legacyKds + legacyQr + legacyTakeRate)
    const annualSavings = Math.max(0, legacySum - prominentzAnnual)

    if (savingsTotal) savingsTotal.textContent = `$${annualSavings.toLocaleString()}`
    if (legacyTotal) legacyTotal.textContent = `$${legacySum.toLocaleString()} / yr`
  }

  if (revInput && termInput) {
    revInput.addEventListener('input', () => {
      revBtns.forEach((b) => b.classList.remove('active'))
      updateSavings()
    })

    termInput.addEventListener('input', () => {
      termBtns.forEach((b) => b.classList.remove('active'))
      updateSavings()
    })

    revBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        revBtns.forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        revInput.value = btn.getAttribute('data-rev')
        updateSavings()
      })
    })

    termBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        termBtns.forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        termInput.value = btn.getAttribute('data-term')
        updateSavings()
      })
    })

    updateSavings()
  }

  // 3. Role Tabs Switcher
  const roleTabs = document.querySelectorAll('.role-tab')
  const rolePanels = document.querySelectorAll('.role-panel')

  roleTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetRole = tab.getAttribute('data-role')

      roleTabs.forEach((t) => {
        t.classList.remove('active')
        t.setAttribute('aria-selected', 'false')
      })
      rolePanels.forEach((p) => p.classList.remove('active'))

      tab.classList.add('active')
      tab.setAttribute('aria-selected', 'true')

      const panel = document.getElementById(`role-panel-${targetRole}`)
      if (panel) panel.classList.add('active')
    })
  })

  // 4. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item')

  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question')
    const answer = item.querySelector('.faq-answer')
    const icon = item.querySelector('.faq-icon')

    if (question && answer) {
      question.addEventListener('click', () => {
        const isOpen = answer.classList.contains('open')

        // Close other items
        faqItems.forEach((other) => {
          const otherAns = other.querySelector('.faq-answer')
          const otherIcon = other.querySelector('.faq-icon')
          const otherBtn = other.querySelector('.faq-question')
          if (otherAns) otherAns.classList.remove('open')
          if (otherIcon) otherIcon.textContent = '+'
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false')
        })

        if (!isOpen) {
          answer.classList.add('open')
          question.setAttribute('aria-expanded', 'true')
          if (icon) icon.textContent = '×'
        }
      })
    }
  })
})
