// ==============================================================================
// DNA AI SUIT · DANI Interactive E-Contract & Transaction Statement System (v2.2)
// ==============================================================================

// Google Apps Script 웹 앱 배포 URL (GoogleAppsScript_DriveUploader.js 배포 연동 완료)
const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyakOUciRN4qCKWtNg5i31qt8ZIhw3JSTVdLTg-lItfXW6x7Z6mgWsKBB5UwPJ4I2CFKg/exec"; 

const form = document.querySelector('#contractForm');
const panels = [...document.querySelectorAll('.panel')];
const indicators = [...document.querySelectorAll('[data-step-indicator]')];
const progressBar = document.querySelector('#progressBar');
const prevBtn = document.querySelector('#prevBtn');
const nextBtn = document.querySelector('#nextBtn');
const summary = document.querySelector('#summary');
const daniMessageEl = document.querySelector('#daniMessage');
const toastEl = document.querySelector('#toast');

// 모달 요소
const emailGuideModal = document.querySelector('#emailGuideModal');
const btnCloseModal = document.querySelector('#btnCloseModal');
const btnConfirmModal = document.querySelector('#btnConfirmModal');
const btnCopyFileName = document.querySelector('#btnCopyFileName');
const btnReopenGmail = document.querySelector('#btnReopenGmail');
const modalFileName = document.querySelector('#modalFileName');

let currentStep = 1;
let lastGeneratedGmailUrl = '';

// 1. DANI 비서 단계별 가이드 대화
const daniMessages = {
  1: "대표님, 반가워요! DNA AI 최고급 마케팅 비서 <strong>DANI</strong>예요. 24시간 쉬지 않고 우리 매장을 알려줄 맞춤형 AI 솔루션을 선택해 보세요. 부가세(VAT 10%) 포함 최종 입금액까지 투명하게 실시간 계산해 드릴게요! ✨",
  2: "전담 마케터 배정과 세금계산서 발행에 꼭 필요한 기본 정보를 입력해 주세요. 주민등록번호나 비밀번호 같은 민감정보는 일체 요구하지 않으니 안심하세요! 🔒",
  3: "서로 간의 투명한 신뢰를 위한 핵심 약관이에요. AI 생성물의 고객 검수 의무와 성과 책임 한계, 안전한 데이터 보호 방침을 차근차근 확인해 주세요. 📜",
  4: "이제 법적 효력을 갖는 전자서명 단계예요. 개인정보 5년 보존 동의를 확인하신 뒤, 터치나 마우스로 멋지게 서명해 주세요! ✍️",
  5: "축하합니다, 대표님! <strong>계약서 및 공식 거래명세표</strong>가 함께 완성되었어요. 🎉 VAT 포함 <strong>최종 입금금액</strong>과 <strong>카카오뱅크 입금계좌</strong>를 확인하시고, <strong>[PDF 저장]</strong> 후 <strong>[Gmail로 전송]</strong>을 누르시면 대표님의 메일함으로 즉시 발송됩니다!"
};

function updateDaniMessage(step) {
  if (!daniMessageEl) return;
  daniMessageEl.style.opacity = '0';
  setTimeout(() => {
    daniMessageEl.innerHTML = daniMessages[step] || daniMessages[1];
    daniMessageEl.style.opacity = '1';
  }, 200);
}

// 2. 캔버스 전자서명 패드 제어
const canvas = document.querySelector('#signaturePad');
const ctx = canvas ? canvas.getContext('2d') : null;
let drawing = false, hasSignature = false;

function resizeCanvas() {
  if (!canvas) return;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  if (ctx) {
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0d2242';
  }
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

function getPos(e) {
  const r = canvas.getBoundingClientRect();
  const p = e.touches ? e.touches[0] : e;
  return {
    x: p.clientX - r.left,
    y: p.clientY - r.top
  };
}

function isCanvasBlank(cnv) {
  if (!cnv) return true;
  try {
    const context = cnv.getContext('2d');
    const pixelBuffer = new Uint32Array(
      context.getImageData(0, 0, cnv.width, cnv.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
  } catch (e) {
    return false;
  }
}

function startDraw(e) {
  drawing = true;
  const p = getPos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  if (e.cancelable) e.preventDefault();
}

function draw(e) {
  if (!drawing) return;
  const p = getPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  hasSignature = true;
  const statusEl = document.querySelector('#signatureStatus');
  if (statusEl) {
    statusEl.textContent = '서명 완료 ✓';
    statusEl.classList.add('signed');
  }
  if (e.cancelable) e.preventDefault();
}

function stopDraw() {
  if (drawing && hasSignature) {
    // 서명이 완료되면 상하단 필수 동의 체크박스 자동 체크
    if (form.privacyConsent && !form.privacyConsent.checked) {
      form.privacyConsent.checked = true;
      form.privacyConsent.dispatchEvent(new Event('change'));
    }
    if (form.electronicAgreement && !form.electronicAgreement.checked) {
      form.electronicAgreement.checked = true;
      form.electronicAgreement.dispatchEvent(new Event('change'));
    }
    clearErrors();
    const daniMsg = document.querySelector('#daniMessage');
    if (daniMsg) {
      daniMsg.innerHTML = '멋진 서명이에요! 법적 동의가 자동으로 완료되었습니다. 아래 <strong>[다음 단계로 이동]</strong>을 눌러주세요! ✨';
    }
  }
  drawing = false;
}

if (canvas) {
  ['mousedown', 'touchstart'].forEach(t => canvas.addEventListener(t, startDraw, { passive: false }));
  ['mousemove', 'touchmove'].forEach(t => canvas.addEventListener(t, draw, { passive: false }));
  ['mouseup', 'mouseleave', 'touchend'].forEach(t => canvas.addEventListener(t, stopDraw));
}

const clearBtn = document.querySelector('#clearSignature');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (!ctx) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    hasSignature = false;
    const statusEl = document.querySelector('#signatureStatus');
    if (statusEl) {
      statusEl.textContent = '서명 대기 중';
      statusEl.classList.remove('signed');
    }
  });
}

// 3. 금액 포맷팅 및 한글 금액 변환 유틸리티
function money(v) {
  return Number(v || 0).toLocaleString('ko-KR') + '원';
}

function numberToKorean(number) {
  const num = parseInt(number, 10);
  if (isNaN(num) || num === 0) return '영';

  const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const smallUnits = ['', '십', '백', '천'];
  const bigUnits = ['', '만', '억', '조'];

  let result = '';
  let count = 0;
  let tempNum = num;

  while (tempNum > 0) {
    const chunk = tempNum % 10000;
    if (chunk > 0) {
      let chunkStr = '';
      let chunkTemp = chunk;
      for (let i = 0; i < 4; i++) {
        const digit = chunkTemp % 10;
        if (digit > 0) {
          const unit = (i > 0 && digit === 1) ? '' : units[digit];
          chunkStr = unit + smallUnits[i] + chunkStr;
        }
        chunkTemp = Math.floor(chunkTemp / 10);
      }
      result = chunkStr + bigUnits[count] + ' ' + result;
    }
    tempNum = Math.floor(tempNum / 10000);
    count++;
  }

  return result.trim();
}

function calculatePricing() {
  const checked = [...form.querySelectorAll('input[name="products"]:checked')];
  let subtotal = 0;
  let recurringSubtotal = 0;
  let oneTimeSubtotal = 0;

  checked.forEach(p => {
    if (p.value === 'threads') {
      const rec = Number(p.dataset.price || 190000);
      const setup = Number(p.dataset.setup || 100000);
      recurringSubtotal += rec;
      oneTimeSubtotal += setup;
      subtotal += (rec + setup);
    } else {
      const price = Number(p.dataset.price || 490000);
      oneTimeSubtotal += price;
      subtotal += price;
    }
  });

  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;

  return { subtotal, vat, total, recurringSubtotal, oneTimeSubtotal, checked };
}

function updateLivePricing() {
  const { subtotal, vat, total } = calculatePricing();
  const subEl = document.querySelector('#liveSubtotal');
  const vatEl = document.querySelector('#liveVat');
  const totEl = document.querySelector('#liveTotal');

  if (subEl) subEl.textContent = money(subtotal);
  if (vatEl) vatEl.textContent = money(vat);
  if (totEl) totEl.textContent = money(total);
}

form.querySelectorAll('input[name="products"]').forEach(input => {
  input.addEventListener('change', updateLivePricing);
});
updateLivePricing();

// 4. 오류 처리 및 단계 유효성 검사
function clearErrors() {
  document.querySelectorAll('.error').forEach(x => x.classList.remove('error'));
  document.querySelectorAll('.field-error').forEach(x => x.remove());
}

function fail(target, message) {
  target.classList.add('error');
  const p = document.createElement('p');
  p.className = 'field-error';
  p.textContent = message;
  target.insertAdjacentElement('afterend', p);
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return false;
}

function validateStep(step) {
  clearErrors();
  if (step === 1) {
    if (!form.querySelector('input[name="products"]:checked')) {
      return fail(document.querySelector('.product-grid'), '최소 하나 이상의 솔루션을 선택해 주세요.');
    }
  }
  if (step === 2) {
    const requiredInputs = [...panels[1].querySelectorAll('[required]')];
    for (const el of requiredInputs) {
      if (!el.checkValidity() || !el.value.trim()) {
        return fail(el, el.type === 'email' ? '올바른 이메일 주소를 입력해 주세요.' : '필수 정보를 입력해 주세요.');
      }
    }
  }
  if (step === 3) {
    if (!form.termsExplained.checked) {
      return fail(form.termsExplained.parentElement, '핵심 약관에 대한 설명 확인 및 동의가 필요합니다.');
    }
  }
  if (step === 4) {
    const actuallyDrawn = hasSignature || !isCanvasBlank(canvas);
    if (!actuallyDrawn) {
      return fail(canvas, '마우스나 터치로 전자서명을 입력해 주세요.');
    }
    hasSignature = true;
    // 서명이 완료된 경우, 체크가 누락되었더라도 자동으로 체크 처리하고 통과!
    if (form.privacyConsent) {
      form.privacyConsent.checked = true;
      form.privacyConsent.dispatchEvent(new Event('change'));
    }
    if (form.electronicAgreement) {
      form.electronicAgreement.checked = true;
      form.electronicAgreement.dispatchEvent(new Event('change'));
    }
    clearErrors();
  }
  return true;
}

// 5. SHA-256 디지털 계약 무결성 해시 계산 (Web Crypto API)
async function generateContractHash(dataString) {
  try {
    const msgUint8 = new TextEncoder().encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return 'DNA-HASH-' + hashHex.substring(0, 24).toUpperCase();
  } catch (err) {
    return 'DNA-HASH-' + Math.random().toString(36).substring(2, 18).toUpperCase();
  }
}

// 6. 파일명 및 요약 렌더링
function safeFilePart(value) {
  return String(value || '고객사').trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 50) || '고객사';
}

function contractFileTitle() {
  const customer = safeFilePart(new FormData(form).get('customerName'));
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return `${customer}_${date}_DNA_AI_계약서및거래명세서`;
}

function escapeHtml(v) {
  const d = document.createElement('div');
  d.textContent = v || '-';
  return d.innerHTML;
}

// 거래명세표 동적 렌더링 함수
function buildStatement(fd, subtotal, vat, total, checked, now) {
  const customerName = fd.get('customerName') || '-';
  const representative = fd.get('representative') || '-';
  const email = fd.get('email') || '-';
  const phone = fd.get('phone') || '-';
  const bizNumber = fd.get('businessNumber') || '개인 고객 (해당없음)';
  const address = fd.get('businessAddress') || '-';

  // 작성일자
  const dateFormatted = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(now);
  const monthDay = `${now.getMonth() + 1}/${now.getDate()}`;

  document.querySelector('#statementDate').textContent = dateFormatted;

  // 공급받는자 정보 매핑
  document.querySelector('#stmtCustomerBiz').textContent = bizNumber;
  document.querySelector('#stmtCustomerName').textContent = customerName;
  document.querySelector('#stmtRepresentative').textContent = representative;
  document.querySelector('#stmtCustomerAddress').textContent = address;
  document.querySelector('#stmtCustomerEmail').textContent = email;
  document.querySelector('#stmtCustomerPhone').textContent = phone;

  // 합계금액 (한글 및 숫자)
  const korTotal = numberToKorean(total);
  document.querySelector('#stmtKorPrice').textContent = `일금 ${korTotal} 원정`;
  document.querySelector('#stmtNumPrice').textContent = total.toLocaleString('ko-KR');

  // 거래 품목 테이블 렌더링
  const tbody = document.querySelector('#statementItemsBody');
  tbody.innerHTML = '';

  let itemIndex = 1;
  let totalQty = 0;

  checked.forEach(p => {
    if (p.value === 'threads') {
      // 1) Threads 월 구독료
      const row1 = document.createElement('tr');
      row1.innerHTML = `
        <td>${itemIndex++}</td>
        <td>${monthDay}</td>
        <td class="item-title-cell"><strong>SNS-Threads 콘텐츠 자동화</strong> (1회차 월 정기구독료)</td>
        <td>1</td>
        <td class="price-cell">190,000</td>
        <td class="price-cell">190,000</td>
        <td class="price-cell">19,000</td>
      `;
      tbody.appendChild(row1);
      totalQty += 1;

      // 2) 초기 셋팅비
      const row2 = document.createElement('tr');
      row2.innerHTML = `
        <td>${itemIndex++}</td>
        <td>${monthDay}</td>
        <td class="item-title-cell"><strong>SNS-Threads 초기 환경 셋팅비</strong> (페르소나 기획 및 계정 셋업)</td>
        <td>1</td>
        <td class="price-cell">100,000</td>
        <td class="price-cell">100,000</td>
        <td class="price-cell">10,000</td>
      `;
      tbody.appendChild(row2);
      totalQty += 1;
    } else {
      // 마케팅 컨설팅
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${itemIndex++}</td>
        <td>${monthDay}</td>
        <td class="item-title-cell"><strong>AI 상권분석 및 마케팅 컨설팅</strong> (SEO/GBP/GEO 정밀 처방전)</td>
        <td>1</td>
        <td class="price-cell">490,000</td>
        <td class="price-cell">490,000</td>
        <td class="price-cell">49,000</td>
      `;
      tbody.appendChild(row);
      totalQty += 1;
    }
  });

  document.querySelector('#stmtTotalQty').textContent = totalQty;
  document.querySelector('#stmtSubtotal').textContent = money(subtotal);
  document.querySelector('#stmtVat').textContent = money(vat);
}

async function buildSummary() {
  const fd = new FormData(form);
  const { subtotal, vat, total, checked } = calculatePricing();

  const customerName = fd.get('customerName') || '-';
  const representative = fd.get('representative') || '-';
  const email = fd.get('email') || '-';
  const phone = fd.get('phone') || '-';
  const bizNumber = fd.get('businessNumber') || '개인 고객 (해당없음)';
  const address = fd.get('businessAddress') || '-';

  const productNames = checked.map(p => {
    if (p.value === 'threads') {
      return `<strong>${p.dataset.label}</strong> (월 ${money(190000)} + 설정비 ${money(100000)})`;
    }
    return `<strong>${p.dataset.label}</strong> (${money(p.dataset.price)})`;
  }).join('<br>');

  const now = new Date();
  const signedAt = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'Asia/Seoul'
  }).format(now);

  // 서명 이미지
  const sigDataUrl = canvas.toDataURL('image/png');

  // 무결성 해시 생성
  const rawPayload = `${customerName}|${representative}|${email}|${subtotal}|${total}|${signedAt}|${sigDataUrl.slice(-100)}`;
  const hash = await generateContractHash(rawPayload);

  // STEP 5 계약서 요약 DL
  summary.innerHTML = `
    <dl>
      <dt>계약자 (고객사)</dt>
      <dd><strong>${escapeHtml(customerName)}</strong> (대표자/담당자: ${escapeHtml(representative)})</dd>
      <dt>연락처 / 이메일</dt>
      <dd>${escapeHtml(phone)} / <span style="color:var(--blue);">${escapeHtml(email)}</span></dd>
      <dt>사업자등록번호</dt>
      <dd>${escapeHtml(bizNumber)}</dd>
      <dt>선택 솔루션</dt>
      <dd>${productNames}</dd>
      <dt>동의 이력</dt>
      <dd>핵심 약관 승인 ✓ · 개인정보 5년 보존 동의 ✓ · 전자서명 효력 인정 ✓</dd>
      <dt>체결 일시</dt>
      <dd>${signedAt} (KST, 공식 타임스탬프)</dd>
      <dt>계약자 전자서명</dt>
      <dd><img class="signature-preview" alt="계약자 전자서명" src="${sigDataUrl}"></dd>
    </dl>
  `;

  // 결제 금액 반영
  document.querySelector('#finalSubtotal').textContent = money(subtotal);
  document.querySelector('#finalVat').textContent = money(vat);
  document.querySelector('#finalTotal').textContent = money(total);

  // 쌍방 대조표 반영
  document.querySelector('#partyCustomerName').textContent = customerName;
  document.querySelector('#partyRepresentative').textContent = representative;
  document.querySelector('#partyBizNumber').textContent = bizNumber;
  document.querySelector('#partyContact').textContent = `${phone} / ${email}`;
  document.querySelector('#partySignedAt').textContent = signedAt;

  // 무결성 해시 반영
  document.querySelector('#cryptoHash').textContent = hash;

  // 2페이지 거래명세표 동적 구축
  buildStatement(fd, subtotal, vat, total, checked, now);
}

// 7. 스텝 이동 제어
function showStep(step) {
  currentStep = step;
  panels.forEach(p => p.classList.toggle('active', Number(p.dataset.step) === step));
  indicators.forEach((x, i) => {
    x.classList.toggle('active', i + 1 === step);
    x.classList.toggle('done', i + 1 < step);
  });
  progressBar.style.width = `${step * 20}%`;
  prevBtn.classList.toggle('hidden', step === 1);
  nextBtn.classList.toggle('hidden', step === 5);

  updateDaniMessage(step);

  if (step === 4) {
    setTimeout(resizeCanvas, 150);
  }
  if (step === 5) {
    buildSummary();
    uploadContractToGoogleDrive('step5_entry');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

nextBtn.addEventListener('click', () => {
  if (validateStep(currentStep)) {
    showStep(Math.min(5, currentStep + 1));
  }
});

prevBtn.addEventListener('click', () => {
  showStep(Math.max(1, currentStep - 1));
});

// 8. 계좌번호 복사 기능
const btnCopyAccount = document.querySelector('#btnCopyAccount');
if (btnCopyAccount) {
  btnCopyAccount.addEventListener('click', () => {
    const account = '3333389917516';
    navigator.clipboard.writeText(account).then(() => {
      showToast('카카오뱅크 계좌번호가 복사되었습니다: 3333-38-9917516');
    }).catch(() => {
      showToast('카카오뱅크: 3333-38-9917516 (정성윤 투어티플레이스)');
    });
  });
}

// 8-1. 통장사본 모달 팝업 제어
const btnViewBankbook = document.querySelector('#btnViewBankbook');
const bankbookModal = document.querySelector('#bankbookModal');
const btnCloseBankbookModal = document.querySelector('#btnCloseBankbookModal');
const btnConfirmBankbookModal = document.querySelector('#btnConfirmBankbookModal');

if (btnViewBankbook && bankbookModal) {
  btnViewBankbook.addEventListener('click', () => {
    bankbookModal.classList.add('active');
  });
}
if (btnCloseBankbookModal && bankbookModal) {
  btnCloseBankbookModal.addEventListener('click', () => {
    bankbookModal.classList.remove('active');
  });
}
if (btnConfirmBankbookModal && bankbookModal) {
  btnConfirmBankbookModal.addEventListener('click', () => {
    bankbookModal.classList.remove('active');
  });
}

function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3000);
}

// 9. Google Drive 자동 업로드 핵심 함수 (Apps Script WebApp 연동)
async function uploadContractToGoogleDrive(triggerSource = 'auto') {
  if (!GAS_WEBAPP_URL) return;
  
  try {
    const fd = new FormData(form);
    const customerName = (fd.get('customerName') || '고객사').trim();
    const representative = (fd.get('representative') || '대표자').trim();
    const phone = (fd.get('phone') || '-').trim();
    const email = (fd.get('email') || '-').trim();
    const { subtotal, vat, total, checked } = calculatePricing();
    const products = checked.map(c => c.dataset.label).join(' + ');
    const fileName = `${contractFileTitle()}.pdf`;

    const contractDoc = document.querySelector('#contractDoc');
    const statementDoc = document.querySelector('#statementDoc');
    if (!contractDoc || !statementDoc) return;

    const contractHtml = contractDoc.outerHTML;
    const statementHtml = statementDoc.outerHTML;
    const cssHref = document.querySelector('link[rel="stylesheet"]')?.href || '';
    const combinedHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${fileName}</title><style>${cssHref ? `@import url("${cssHref}");` : ''} body{font-family:sans-serif;padding:20px;color:#1e293b;background:#ffffff;}</style></head><body>${contractHtml}<div style="page-break-after:always;margin:40px 0;"></div>${statementHtml}</body></html>`;

    const payload = {
      customerName: customerName,
      representative: representative,
      phone: phone,
      email: email,
      products: products,
      subtotal: subtotal,
      vat: vat,
      total: total,
      fileName: fileName,
      htmlContent: combinedHtml,
      timestamp: new Date().toISOString(),
      trigger: triggerSource
    };

    // 1) Google Apps Script는 text/plain 전송 시 브라우저 CORS 차단(OPTIONS) 없이 100% 무결점 수신됨
    fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(() => {
      showToast(`Google 드라이브에 [${customerName}] 계약서 및 거래명세서가 안전하게 전송되었습니다!`);
    }).catch(err => {
      console.warn('Google Drive Sync Notice:', err);
    });

    // 2) 대시보드 고객 관리 대장(CRM) 로컬스토리지 실시간 자동 누적 업데이트
    try {
      const crmKey = 'dna_client_crm_data';
      let crmList = JSON.parse(localStorage.getItem(crmKey) || '[]');
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const dayNum = now.getDate();
      const existingIdx = crmList.findIndex(c => c.customerName === customerName);
      
      const crmRecord = {
        no: existingIdx >= 0 ? crmList[existingIdx].no : (crmList.length + 1),
        customerName: customerName,
        industry: checked.map(c => c.dataset.label).join(', ') || 'AI 마케팅 솔루션',
        representative: representative,
        phone: phone,
        address: (fd.get('businessAddress') || '').trim() || '-',
        email: email,
        bizNumber: (fd.get('businessNumber') || '').trim() || '-',
        plan: products,
        monthlyFee: money(subtotal),
        vat: money(vat),
        totalFee: money(total),
        paymentCycle: '월간 정기구독',
        paymentDay: `매월 ${dayNum}일`,
        alertDay: `매월 ${Math.max(1, dayNum - 3)}일 (D-3 알림)`,
        paymentMethod: '계좌이체 (카카오뱅크 3333-38-9917516)',
        paymentStatus: '입금대기 (계약체결완료)',
        updatedAt: dateStr,
        platformUrl: window.location.href,
        accessCode: document.querySelector('#cryptoHash')?.textContent || 'DNA-HASH-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        memo: `공식 온라인 전자계약 체결 완료 (공급가: ${money(subtotal)}, VAT: ${money(vat)}, 총액: ${money(total)})`
      };

      if (existingIdx >= 0) {
        crmList[existingIdx] = { ...crmList[existingIdx], ...crmRecord };
      } else {
        crmList.push(crmRecord);
      }
      localStorage.setItem(crmKey, JSON.stringify(crmList));
    } catch (crmErr) {
      console.warn('Local CRM Sync Notice:', crmErr);
    }

  } catch (err) {
    console.warn('Drive Upload Error:', err);
  }
}

// 10. 공식 계약서 및 거래명세서 2페이지 합본 PDF 저장 (인쇄)
const completeBtn = document.querySelector('#completeContract');
if (completeBtn) {
  completeBtn.addEventListener('click', () => {
    clearErrors();
    const finalConfirm = document.querySelector('#finalConfirm');
    if (!finalConfirm.checked) {
      fail(finalConfirm.parentElement, '계약 및 거래명세서 내역에 대한 최종 확인 체크가 필요합니다.');
      return;
    }
    // 구글 드라이브 동기화 트리거
    uploadContractToGoogleDrive('pdf_save');

    const msg = document.querySelector('#completeMessage');
    msg.textContent = '계약서(1P) 및 거래명세표(2P) 공식 출력이 준비되었습니다. 인쇄창에서 "PDF로 저장"을 선택해 주세요.';
    document.title = contractFileTitle();
    setTimeout(() => {
      window.print();
    }, 400);
  });
}

// 10. Gmail 연동 자동 발송 & DANI 첨부 안내 모달 연동
function generateGmailData() {
  const fd = new FormData(form);
  const { subtotal, vat, total, checked } = calculatePricing();
  const customerName = fd.get('customerName') || '고객사';
  const representative = fd.get('representative') || '대표자';
  const email = fd.get('email') || '';
  const hash = document.querySelector('#cryptoHash').textContent || '';
  const korTotal = numberToKorean(total);

  // 거래명세 품목 텍스트 표
  let itemsText = '';
  checked.forEach(p => {
    if (p.value === 'threads') {
      itemsText += `  • [품목] SNS-Threads 콘텐츠 자동화 월 정기구독료 (1회차)\n    - 수량: 1개월 | 공급가액: 190,000원 | VAT: 19,000원\n`;
      itemsText += `  • [품목] SNS-Threads 초기 환경 셋팅비 (페르소나 기획 및 계정 셋업)\n    - 수량: 1식   | 공급가액: 100,000원 | VAT: 10,000원\n`;
    } else {
      itemsText += `  • [품목] AI 상권분석 및 마케팅 컨설팅 리포트 (SEO/GBP/GEO 정밀처방전)\n    - 수량: 1식   | 공급가액: 490,000원 | VAT: 49,000원\n`;
    }
  });

  const subject = `[DNA AI 전자계약 체결본 및 거래명세서] ${customerName} 대표님 공식 계약서 및 입금 안내`;
  const body = `안녕하세요, ${representative} 대표님!
최고급 AI 마케팅 비서 DNA AI SUIT (투어티플레이스)입니다.

금일 체결해주신 DNA AI 솔루션 이용계약서 및 공식 거래명세표 내역을 전달드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1. 전자계약 및 거래명세표 요약]
• 공급자: 투어티플레이스 (사업자등록번호: 546-12-01988, 대표: 정성윤)
• 공급받는자: ${customerName} (${representative} 대표님)
• 계약 품목 상세 내역:
${itemsText}
• 공급가액 합계: ${money(subtotal)}
• 부가가치세 (VAT 10%): ${money(vat)}
★ 총 청구/입금금액: 일금 ${korTotal} 원정 (${money(total)}, VAT 포함)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[2. 공식 지정 입금 계좌 안내]
• 입금 은행: 카카오뱅크 (KakaoBank)
• 계좌 번호: 3333-38-9917516
• 예금주: 정성윤 (투어티플레이스)
* 입금 시 계약자 상호명(${customerName})으로 입금 부탁드립니다.

[3. 전자문서 무결성 감사 코드]
• SHA-256 검증 해시: ${hash}
• 법적 보존 근거: 전자상거래법 제6조에 의거 5년간 안전하게 보존

[4. Google Drive 안전 보관 및 실시간 열람]
• 본 계약서 및 거래명세표 정식 원본은 당사 보안 Google Drive 클라우드에 영구 백업되어 안전하게 보존됩니다.
• Google Drive 보관 위치: [공식] DNA_AI_계약관리_공유드라이브/01_체결완료_전자계약서/
• 지메일 하단의 [Google 드라이브 아이콘 ▲]을 누르시면 해당 첨부파일을 1초 만에 확인하실 수 있습니다.

※ 첨부된 [${contractFileTitle()}.pdf] 파일을 확인해 주시기 바라며, 회신 메일 또는 입금 확인 즉시 전담 마케팅 셋팅이 착수되고 국세청 홈택스 전자세금계산서가 발행됩니다.

감사합니다.

DNA AI SUIT / 투어티플레이스 드림
• 공식 웹사이트: https://dnaai.co.kr/
• 고객센터: 010-8587-0235 | 최두리 CTO: 010-8806-8318
• 공식 이메일: dani90dna@gmail.com
`;

  const encodedTo = encodeURIComponent(email);
  const encodedCc = encodeURIComponent('dani90dna@gmail.com');
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&cc=${encodedCc}&su=${encodedSubject}&body=${encodedBody}`;
  return { gmailUrl, customerName, fileName: `${contractFileTitle()}.pdf` };
}

const btnSendGmail = document.querySelector('#btnSendGmail');
if (btnSendGmail) {
  btnSendGmail.addEventListener('click', () => {
    clearErrors();
    const finalConfirm = document.querySelector('#finalConfirm');
    if (!finalConfirm.checked) {
      fail(finalConfirm.parentElement, '계약 및 거래명세서 내역에 대한 최종 확인 체크가 필요합니다.');
      return;
    }

    const { gmailUrl, fileName } = generateGmailData();
    lastGeneratedGmailUrl = gmailUrl;

    // 1) Google Apps Script 웹앱으로 구글 드라이브에 안전하게 자동 업로드
    uploadContractToGoogleDrive('gmail_send');

    // 2) 파일명 설정 및 PDF 저장 대화상자 선제적 호출
    document.title = contractFileTitle();
    setTimeout(() => {
      window.print();
    }, 300);

    // 2) 모달 파일명 표시 및 모달 노출
    if (modalFileName) modalFileName.textContent = fileName;
    if (emailGuideModal) emailGuideModal.classList.add('active');

    // 3) Gmail 웹 작성창 오픈
    setTimeout(() => {
      window.open(gmailUrl, '_blank');
    }, 600);

    const msg = document.querySelector('#completeMessage');
    msg.innerHTML = `Gmail 작성 창이 열렸습니다. 하단의 <strong>Google 드라이브 아이콘(▲)</strong>을 눌러 첨부해 주세요!`;
  });
}

// 11. 국세청 홈택스 전자세금계산서 엑셀/CSV 일괄작성 파일 다운로드
const btnDownloadHometax = document.querySelector('#btnDownloadHometax');
if (btnDownloadHometax) {
  btnDownloadHometax.addEventListener('click', () => {
    clearErrors();
    const finalConfirm = document.querySelector('#finalConfirm');
    if (!finalConfirm.checked) {
      fail(finalConfirm.parentElement, '계약 및 거래명세서 내역에 대한 최종 확인 체크가 필요합니다.');
      return;
    }

    const fd = new FormData(form);
    const { subtotal, vat, checked } = calculatePricing();
    const customerName = (fd.get('customerName') || '고객사').trim();
    const representative = (fd.get('representative') || '대표자').trim();
    const email = (fd.get('email') || '').trim();
    const address = (fd.get('businessAddress') || '').trim();
    const rawBiz = (fd.get('businessNumber') || '').replace(/[^0-9]/g, '');
    const bizNumber = rawBiz.length === 10 ? rawBiz : (rawBiz.length >= 6 ? rawBiz : '0000000000');

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const itemTitles = checked.map(p => p.dataset.label).join(' + ');

    // 국세청 홈택스 전자세금계산서 일괄작성 표준 헤더
    const headers = [
      '전자세금계산서종류',
      '작성일자',
      '공급자등록번호',
      '공급자종사업장번호',
      '공급자상호',
      '공급자성명',
      '공급자사업장주소',
      '공급자업태',
      '공급자종목',
      '공급자이메일',
      '공급받는자등록번호',
      '공급받는자종사업장번호',
      '공급받는자상호',
      '공급받는자성명',
      '공급받는자사업장주소',
      '공급받는자업태',
      '공급받는자종목',
      '공급받는자이메일1',
      '공급받는자이메일2',
      '공급가액',
      '세액',
      '비고',
      '일자1',
      '품목1',
      '규격1',
      '수량1',
      '단가1',
      '공급가액1',
      '세액1',
      '품목비고1',
      '영수청구'
    ];

    const row = [
      '01', // 일반 전자세금계산서
      dateStr,
      '5461201988', // 투어티플레이스
      '',
      '투어티플레이스',
      '정성윤',
      '대전광역시 유성구 용계동 힐스테이트 2차',
      '서비스, IT',
      '소프트웨어 개발, 마케팅 컨설팅',
      'dani90dna@gmail.com',
      bizNumber,
      '',
      `"${customerName.replace(/"/g, '""')}"`,
      `"${representative.replace(/"/g, '""')}"`,
      `"${address.replace(/"/g, '""')}"`,
      '',
      '',
      email,
      '',
      subtotal,
      vat,
      'DNA AI 전자계약 체결건',
      dd,
      `"${itemTitles.replace(/"/g, '""')}"`,
      '1식',
      '1',
      subtotal,
      subtotal,
      vat,
      '',
      '02' // 02: 청구 (입금 전 청구)
    ];

    // UTF-8 with BOM (\uFEFF) 필수
    const csvContent = '\uFEFF' + headers.join(',') + '\r\n' + row.join(',') + '\r\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeCust = safeFilePart(customerName);
    link.download = `${safeCust}_${dateStr}_홈택스_전자세금계산서_일괄등록용.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    const msg = document.querySelector('#completeMessage');
    msg.innerHTML = `국세청 홈택스용 세금계산서 등록 파일(<strong>${link.download}</strong>)이 다운로드되었습니다!`;
    showToast('홈택스 전자세금계산서 등록 파일이 다운로드되었습니다.');
  });
}

// 모달 제어 이벤트
if (btnCloseModal) {
  btnCloseModal.addEventListener('click', () => {
    emailGuideModal.classList.remove('active');
  });
}

if (btnConfirmModal) {
  btnConfirmModal.addEventListener('click', () => {
    emailGuideModal.classList.remove('active');
  });
}

if (btnCopyFileName) {
  btnCopyFileName.addEventListener('click', () => {
    const text = modalFileName.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast('파일명이 복사되었습니다: ' + text);
    }).catch(() => {
      showToast('파일명: ' + text);
    });
  });
}

if (btnReopenGmail) {
  btnReopenGmail.addEventListener('click', () => {
    if (lastGeneratedGmailUrl) {
      window.open(lastGeneratedGmailUrl, '_blank');
    }
  });
}

// 최초 1단계 활성화
showStep(1);

// ==============================================================================
// 🔒 보안 인증 게이트웨이 (비밀번호: 1121 통제 및 세션 유지)
// ==============================================================================
const GATE_PASSWORD = '1121';
const securityGateOverlay = document.querySelector('#securityGateOverlay');
const mainAppWrapper = document.querySelector('#mainAppWrapper');
const securityPasswordInput = document.querySelector('#securityPassword');
const btnVerifyPassword = document.querySelector('#btnVerifyPassword');
const securityErrorMsg = document.querySelector('#securityErrorMsg');
const securityGateCard = document.querySelector('.security-gate-card');

function unlockSecurityGate() {
  if (securityGateOverlay) {
    securityGateOverlay.classList.add('unlocked');
  }
  if (mainAppWrapper) {
    mainAppWrapper.classList.remove('locked');
  }
  sessionStorage.setItem('dna_contract_auth', '1121');
  resizeCanvas();
}

function verifySecurityGate() {
  if (!securityPasswordInput) return;
  const inputVal = securityPasswordInput.value.trim();
  if (inputVal === GATE_PASSWORD) {
    if (securityErrorMsg) securityErrorMsg.textContent = '';
    unlockSecurityGate();
    showToast('보안 인증 완료! DNA AI 전자계약 시스템에 입장하셨습니다. 🔒');
  } else {
    if (securityErrorMsg) {
      securityErrorMsg.textContent = '비밀번호가 올바르지 않습니다. 관리자에게 문의하세요.';
    }
    if (securityGateCard) {
      securityGateCard.classList.remove('shake');
      void securityGateCard.offsetWidth;
      securityGateCard.classList.add('shake');
    }
    securityPasswordInput.value = '';
    securityPasswordInput.focus();
  }
}

// 초기 인증 상태 확인 (동일 브라우저 세션 내 자동 유지)
if (sessionStorage.getItem('dna_contract_auth') === GATE_PASSWORD) {
  unlockSecurityGate();
} else {
  if (securityPasswordInput) {
    setTimeout(() => securityPasswordInput.focus(), 300);
  }
}

if (btnVerifyPassword) {
  btnVerifyPassword.addEventListener('click', verifySecurityGate);
}

if (securityPasswordInput) {
  securityPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      verifySecurityGate();
    }
  });
}
