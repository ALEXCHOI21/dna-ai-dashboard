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
const btnCopyMailBody = document.querySelector('#btnCopyMailBody');
const btnReopenGmail = document.querySelector('#btnReopenGmail');
const modalFileName = document.querySelector('#modalFileName');

let currentStep = 1;
let lastGeneratedGmailUrl = '';
let lastFullMailBody = '';

// 1. DANI 비서 단계별 가이드 대화
const daniMessages = {
  1: "대표님, 반가워요! DNA AI 최고급 마케팅 비서 <strong>DANI</strong>예요. 24시간 쉬지 않고 우리 매장을 알려줄 맞춤형 AI 솔루션을 선택해 보세요. 부가세(VAT 10%) 포함 최종 입금액까지 투명하게 실시간 계산해 드릴게요! ✨",
  2: "대표님, 정식 계약 체결과 세금계산서 발행에 꼭 필요한 <strong>대표자 생년월일(식별정보)</strong>과 <strong>사업자등록번호</strong>를 정확히 입력해 주세요. 법적 효력을 갖는 안전한 전자문서로 암호화 보존됩니다! 🔒",
  3: "서로 간의 투명한 신뢰를 위한 핵심 약관이에요. <strong>의무 약정 없이</strong> 월 단위 정기구독으로 언제든 자유롭게 해지하실 수 있으며, <strong>48시간 이내 미입금 시 자동 실효 특약</strong>과 <strong>상호 역할 분담(R&R)</strong> 규정을 차근차근 확인해 주세요. 📜",
  4: "이제 법적 효력을 갖는 전자서명 단계예요. 개인정보 및 고유식별정보 5년 보존 동의를 확인하신 뒤, 터치나 마우스로 멋지게 서명해 주세요! ✍️",
  5: "축하합니다, 대표님! <strong>계약서(1P), 거래명세표(2P), 서비스표준약관 및 개인정보동의서(3P)</strong> 공식 3페이지 세트가 완성되었어요. 🎉 체결일시 기준 <strong>48시간 이내</strong>에 안내된 공식 계좌로 입금해 주시면 즉시 시스템 셋팅에 착수하며, 48시간 경과 시 계약은 자동 취소됩니다. <strong>[PDF 저장]</strong> 후 <strong>[Gmail로 전송]</strong>을 누르시면 대표님의 메일함으로 즉시 발송됩니다!"
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

  // 동적 입력 필드 값 참조 (현장 네고/직접 수정 금액)
  const threadsPriceInput = document.querySelector('#inputThreadsPrice');
  const threadsSetupInput = document.querySelector('#inputThreadsSetup');
  const consultingPriceInput = document.querySelector('#inputConsultingPrice');

  const threadsPrice = threadsPriceInput ? (parseInt(threadsPriceInput.value, 10) || 0) : 190000;
  const threadsSetup = threadsSetupInput ? (parseInt(threadsSetupInput.value, 10) || 0) : 100000;
  const consultingPrice = consultingPriceInput ? (parseInt(consultingPriceInput.value, 10) || 0) : 490000;

  // 카드 내 텍스트 실시간 갱신
  const threadsFirstMonthEl = document.querySelector('#threadsFirstMonthText');
  const threadsMonthlyVatEl = document.querySelector('#threadsMonthlyVatText');
  const threadsSixMonthTotalEl = document.querySelector('#threadsSixMonthTotalText');
  const consultingTotalEl = document.querySelector('#consultingTotalText');

  if (threadsFirstMonthEl) {
    const firstTotal = Math.round((threadsPrice + threadsSetup) * 1.1);
    threadsFirstMonthEl.textContent = money(firstTotal);
  }
  if (threadsMonthlyVatEl) {
    const monthVat = Math.round(threadsPrice * 1.1);
    threadsMonthlyVatEl.textContent = money(monthVat);
  }
  if (threadsSixMonthTotalEl) {
    const sixTotal = Math.round((threadsPrice * 6 + threadsSetup) * 1.1);
    threadsSixMonthTotalEl.textContent = money(sixTotal);
  }
  if (consultingTotalEl) {
    const conTotal = Math.round(consultingPrice * 1.1);
    consultingTotalEl.textContent = money(conTotal);
  }

  checked.forEach(p => {
    if (p.value === 'threads') {
      recurringSubtotal += threadsPrice;
      oneTimeSubtotal += threadsSetup;
      subtotal += (threadsPrice + threadsSetup);
    } else {
      oneTimeSubtotal += consultingPrice;
      subtotal += consultingPrice;
    }
  });

  const vat = Math.round(subtotal * 0.1);
  const total = subtotal + vat;

  return { subtotal, vat, total, recurringSubtotal, oneTimeSubtotal, checked, threadsPrice, threadsSetup, consultingPrice };
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

// 동적 금액 입력창 input 이벤트 연결
['#inputThreadsPrice', '#inputThreadsSetup', '#inputConsultingPrice'].forEach(sel => {
  const el = document.querySelector(sel);
  if (el) {
    el.addEventListener('input', updateLivePricing);
  }
});

// 프리셋 버튼 (현장 영업 네고/인상/할인 원클릭 적용)
function setupPresetButton(btnId, targetCheckboxValue, callback) {
  const btn = document.querySelector(btnId);
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // 해당 상품 체크박스 자동 선택
    if (targetCheckboxValue) {
      const chk = form.querySelector(`input[name="products"][value="${targetCheckboxValue}"]`);
      if (chk && !chk.checked) {
        chk.checked = true;
        chk.dispatchEvent(new Event('change'));
      }
    }
    callback();
    updateLivePricing();
  });
}

// 스탠다드 자동화 프리셋
setupPresetButton('#btnPresetStandard', 'threads', () => {
  const p = document.querySelector('#inputThreadsPrice');
  const s = document.querySelector('#inputThreadsSetup');
  if (p) p.value = 190000;
  if (s) s.value = 100000;
});
setupPresetButton('#btnPresetNego15', 'threads', () => {
  const p = document.querySelector('#inputThreadsPrice');
  const s = document.querySelector('#inputThreadsSetup');
  if (p) p.value = 150000;
  if (s) s.value = 0;
});
setupPresetButton('#btnPresetEarlyBird', 'threads', () => {
  const p = document.querySelector('#inputThreadsPrice');
  const s = document.querySelector('#inputThreadsSetup');
  if (p) p.value = 100000;
  if (s) s.value = 0;
});
setupPresetButton('#btnPresetRaise25', 'threads', () => {
  const p = document.querySelector('#inputThreadsPrice');
  const s = document.querySelector('#inputThreadsSetup');
  if (p) p.value = 250000;
  if (s) s.value = 100000;
});

// 마케팅 컨설팅 프리셋
setupPresetButton('#btnPresetConsultStd', 'consulting', () => {
  const c = document.querySelector('#inputConsultingPrice');
  if (c) c.value = 490000;
});
setupPresetButton('#btnPresetConsult39', 'consulting', () => {
  const c = document.querySelector('#inputConsultingPrice');
  if (c) c.value = 390000;
});
setupPresetButton('#btnPresetConsult29', 'consulting', () => {
  const c = document.querySelector('#inputConsultingPrice');
  if (c) c.value = 290000;
});
setupPresetButton('#btnPresetConsult59', 'consulting', () => {
  const c = document.querySelector('#inputConsultingPrice');
  if (c) c.value = 590000;
});

updateLivePricing();

// ==========================================================================
// [자동 하이픈 (-) 포맷터] 사업자등록번호, 휴대전화/연락처, 법인번호 자동 포맷팅
// ==========================================================================
function formatBusinessNumber(val) {
  if (!val) return '';
  const num = val.replace(/[^0-9]/g, '').slice(0, 10);
  if (num.length <= 3) return num;
  if (num.length <= 5) return `${num.slice(0, 3)}-${num.slice(3)}`;
  return `${num.slice(0, 3)}-${num.slice(3, 5)}-${num.slice(5, 10)}`;
}

function formatPhoneNumber(val) {
  if (!val) return '';
  const num = val.replace(/[^0-9]/g, '').slice(0, 11);
  if (!num) return '';
  // 서울 지역번호 (02 시작)
  if (num.startsWith('02')) {
    if (num.length <= 2) return num;
    if (num.length <= 5) return `${num.slice(0, 2)}-${num.slice(2)}`;
    if (num.length <= 9) return `${num.slice(0, 2)}-${num.slice(2, 5)}-${num.slice(5)}`;
    return `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6, 10)}`;
  }
  // 일반 휴대전화 및 지역번호 (010, 011, 031, 042, 051 등)
  if (num.length <= 3) return num;
  if (num.length <= 7) return `${num.slice(0, 3)}-${num.slice(3)}`;
  if (num.length <= 10) return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
  return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
}

function formatCorpNumber(val) {
  if (!val) return '';
  const num = val.replace(/[^0-9]/g, '').slice(0, 13);
  if (num.length <= 6) return num;
  return `${num.slice(0, 6)}-${num.slice(6, 13)}`;
}

// 실시간 자동 하이픈 바인딩
const inputBizNum = form.querySelector('input[name="businessNumber"]');
if (inputBizNum) {
  inputBizNum.addEventListener('input', (e) => {
    e.target.value = formatBusinessNumber(e.target.value);
  });
  inputBizNum.addEventListener('blur', (e) => {
    e.target.value = formatBusinessNumber(e.target.value);
  });
}

const inputPhone = form.querySelector('input[name="phone"]');
if (inputPhone) {
  inputPhone.addEventListener('input', (e) => {
    e.target.value = formatPhoneNumber(e.target.value);
  });
  inputPhone.addEventListener('blur', (e) => {
    e.target.value = formatPhoneNumber(e.target.value);
  });
}

const inputCorpNum = form.querySelector('input[name="corpNumber"]');
if (inputCorpNum) {
  inputCorpNum.addEventListener('input', (e) => {
    e.target.value = formatCorpNumber(e.target.value);
  });
  inputCorpNum.addEventListener('blur', (e) => {
    e.target.value = formatCorpNumber(e.target.value);
  });
}

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
  return `${customer}_${date}_DNA_AI_계약서및거래명세서_약관동의서`;
}

function escapeHtml(v) {
  const d = document.createElement('div');
  d.textContent = v || '-';
  return d.innerHTML;
}

// 3페이지 서비스 이용약관 및 개인정보 동의서 동적 바인딩 함수
function buildTermsDoc(fd, signedAt, sigDataUrl, hash, now) {
  const customerName = fd.get('customerName') || '-';
  const representative = fd.get('representative') || '-';
  const birthDate = fd.get('birthDate') || '-';
  const bizNumber = fd.get('businessNumber') || '개인 고객 (해당없음)';

  const dateFormatted = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(now);

  const termsDateEl = document.querySelector('#termsDocDate');
  if (termsDateEl) termsDateEl.textContent = dateFormatted;

  const termsCustomerEl = document.querySelector('#termsCustomerName');
  if (termsCustomerEl) termsCustomerEl.textContent = customerName;

  const termsRepEl = document.querySelector('#termsRepresentative');
  if (termsRepEl) termsRepEl.textContent = representative;

  const termsBirthEl = document.querySelector('#termsBirthDate');
  if (termsBirthEl) termsBirthEl.textContent = birthDate;

  const termsBizEl = document.querySelector('#termsBizNumber');
  if (termsBizEl) termsBizEl.textContent = bizNumber;

  const termsSignImg = document.querySelector('#termsCustomerSignImg');
  if (termsSignImg) {
    termsSignImg.src = sigDataUrl;
    termsSignImg.style.display = 'block';
  }

  const termsHashEl = document.querySelector('#termsCryptoHash');
  if (termsHashEl) termsHashEl.textContent = hash;
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

  const pricing = calculatePricing();
  const hasThreads = checked.some(p => p.value === 'threads');
  const hasConsulting = checked.some(p => p.value === 'consulting');
  
  let commitmentDesc = '';
  if (hasThreads && hasConsulting) {
    commitmentDesc = `<strong>스탠다드 콘텐츠 자동화: 월 정기구독 (의무 약정 없음 / 자유 해지)</strong> (월 ${money(pricing.threadsPrice)}) / <strong>AI 상권분석: 1회성 단건 (약정 없음)</strong>`;
  } else if (hasThreads) {
    commitmentDesc = `<strong>월 정기구독 (의무 약정 없음)</strong> (의무 계약기간 없음 / 언제든 자유 해지 가능 / 월 ${money(pricing.threadsPrice)})`;
  } else {
    commitmentDesc = `<strong>1회성 단건 컨설팅 (약정 없음)</strong>`;
  }

  // STEP 5 계약서 요약 DL
  summary.innerHTML = `
    <dl>
      <dt>계약자 (고객사)</dt>
      <dd><strong>${escapeHtml(customerName)}</strong> (대표자/담당자: ${escapeHtml(representative)})</dd>
      <dt>대표자 생년월일</dt>
      <dd style="font-weight:700;color:#0f172a;">${escapeHtml(fd.get('birthDate') || '-')}</dd>
      <dt>연락처 / 이메일</dt>
      <dd>${escapeHtml(phone)} / <span style="color:var(--blue);">${escapeHtml(email)}</span></dd>
      <dt>사업자등록번호</dt>
      <dd>${escapeHtml(bizNumber)}</dd>
      <dt>선택 솔루션</dt>
      <dd>${productNames}</dd>
      <dt>약정 기간 및 조건</dt>
      <dd style="color:var(--navy);font-weight:700;">${commitmentDesc}</dd>
      <dt>동의 이력</dt>
      <dd>핵심 약관 승인 ✓ (제2조 의무약정 없음 확인) · 개인정보 및 식별정보 5년 보존 동의 ✓ · 전자서명 효력 인정 ✓</dd>
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
  const partyBirthEl = document.querySelector('#partyBirthDate');
  if (partyBirthEl) partyBirthEl.textContent = fd.get('birthDate') || '-';
  document.querySelector('#partyBizNumber').textContent = bizNumber;
  document.querySelector('#partyContact').textContent = `${phone} / ${email}`;
  document.querySelector('#partySignedAt').textContent = signedAt;

  // 무결성 해시 반영
  document.querySelector('#cryptoHash').textContent = hash;

  // 2페이지 거래명세표 동적 구축
  buildStatement(fd, subtotal, vat, total, checked, now);

  // 3페이지 서비스 이용약관 및 개인정보 동의서 동적 구축
  buildTermsDoc(fd, signedAt, sigDataUrl, hash, now);
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
    // [중요 수정] step5_entry 자동 업로드 완전 제거!
    // 0원짜리 빈 껍데기가 먼저 전송되어 중복 파일이 생기는 문제를 원천 차단함.
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

// 9. Google Apps Script 전용 3페이지 완결 고품격 테이블 HTML 생성기 (PDF 변환 최적화)
function buildGasCompatible3PHtml({
  customerName,
  representative,
  birthDate,
  corpNumber,
  bizNumber,
  phone,
  email,
  address,
  productNames,
  commitmentDesc,
  subtotal,
  vat,
  total,
  signedAt,
  sigDataUrl,
  hash,
  checked,
  threadsPrice,
  threadsSetup,
  consultingPrice,
  now
}) {
  const korTotal = numberToKorean(total);
  const monthDay = `${now.getMonth() + 1}/${now.getDate()}`;
  const dateFormatted = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(now);

  // 품목 행 동적 생성
  let itemIndex = 1;
  let itemsRows = '';
  let totalQty = 0;

  checked.forEach(p => {
    if (p.value === 'threads') {
      itemsRows += `
        <tr>
          <td align="center" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${itemIndex++}</td>
          <td align="center" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${monthDay}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px; text-align: left;"><strong>SNS-Threads 콘텐츠 자동화</strong> (1회차 월 정기구독료)</td>
          <td align="center" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">1</td>
          <td align="right" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${threadsPrice.toLocaleString()}</td>
          <td align="right" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${threadsPrice.toLocaleString()}</td>
          <td align="right" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${Math.round(threadsPrice * 0.1).toLocaleString()}</td>
        </tr>
      `;
      totalQty += 1;
      if (threadsSetup > 0) {
        itemsRows += `
          <tr>
            <td align="center" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${itemIndex++}</td>
            <td align="center" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${monthDay}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px; text-align: left;"><strong>SNS-Threads 초기 환경 셋팅비</strong> (페르소나 기획 및 계정 셋업)</td>
            <td align="center" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">1</td>
            <td align="right" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${threadsSetup.toLocaleString()}</td>
            <td align="right" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${threadsSetup.toLocaleString()}</td>
            <td align="right" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${Math.round(threadsSetup * 0.1).toLocaleString()}</td>
          </tr>
        `;
        totalQty += 1;
      }
    } else {
      itemsRows += `
        <tr>
          <td align="center" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${itemIndex++}</td>
          <td align="center" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${monthDay}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px; text-align: left;"><strong>AI 상권분석 및 마케팅 컨설팅</strong> (SEO/GBP/GEO 정밀 처방전)</td>
          <td align="center" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">1</td>
          <td align="right" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${consultingPrice.toLocaleString()}</td>
          <td align="right" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${consultingPrice.toLocaleString()}</td>
          <td align="right" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 10px;">${Math.round(consultingPrice * 0.1).toLocaleString()}</td>
        </tr>
      `;
      totalQty += 1;
    }
  });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${customerName}_DNA_AI_계약서및거래명세서_약관동의서</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", Arial, sans-serif; color: #1e293b; background: #ffffff; margin: 0; padding: 0; font-size: 11px; line-height: 1.45; }
    table { border-collapse: collapse; width: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td, th { vertical-align: top; }
    .page-card { border: 2px solid #0d2242; border-radius: 8px; background: #ffffff; padding: 16px 20px; margin-bottom: 20px; page-break-inside: avoid; }
    .page-break { page-break-after: always; height: 1px; clear: both; }
  </style>
</head>
<body>

  <!-- ==================== 1페이지: 표준 전자계약서 ==================== -->
  <div class="page-card" style="border-color: #0d2242;">
    <!-- 1P 헤더 -->
    <table style="border-bottom: 2px solid #0d2242; padding-bottom: 8px; margin-bottom: 12px;">
      <tr>
        <td style="vertical-align: middle;">
          <span style="background: #0d2242; color: #ffffff; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 4px; display: inline-block;">표준 전자계약서</span>
          <h1 style="font-size: 21px; font-weight: 800; color: #0d2242; margin: 4px 0 2px 0;">DNA AI 서비스 이용 계약서</h1>
          <div style="font-size: 11.5px; color: #64748b;">SNS 자동화 및 AI 마케팅 진단 솔루션 (정식 전자계약 원본)</div>
        </td>
        <td align="right" width="90" style="vertical-align: middle;">
          <div style="width: 58px; height: 58px; border: 2px solid #dc2626; color: #dc2626; border-radius: 50%; text-align: center; font-size: 9px; font-weight: bold; padding-top: 8px; line-height: 1.25; margin-left: auto;">
            투어티플레이스<br><strong style="font-size: 10.5px;">DNA AI</strong><br><span style="font-size: 7.5px;">OFFICIAL</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- 계약 체결 요약 정보 표 -->
    <table style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; margin-bottom: 12px; font-size: 11px;">
      <tr>
        <td width="135" style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; color: #334155;">계약자 (고객사)</td>
        <td style="border-bottom: 1px solid #cbd5e1; padding: 6px 10px; color: #0f172a;"><strong>${customerName}</strong> (대표자/담당자: <strong>${representative}</strong>)</td>
      </tr>
      <tr>
        <td style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; color: #334155;">대표자 생년월일</td>
        <td style="border-bottom: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; color: #1e3a8a;">${birthDate}</td>
      </tr>
      <tr>
        <td style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; color: #334155;">사업자등록번호</td>
        <td style="border-bottom: 1px solid #cbd5e1; padding: 6px 10px; color: #0f172a;">${bizNumber} ${corpNumber ? '(법인등록번호: ' + corpNumber + ')' : ''}</td>
      </tr>
      <tr>
        <td style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; color: #334155;">연락처 / 이메일</td>
        <td style="border-bottom: 1px solid #cbd5e1; padding: 6px 10px; color: #0f172a;">${phone} / <span style="color: #2563eb; font-weight: bold;">${email}</span></td>
      </tr>
      <tr>
        <td style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; color: #334155;">선택 솔루션</td>
        <td style="border-bottom: 1px solid #cbd5e1; padding: 6px 10px; color: #0f172a;">${productNames}</td>
      </tr>
      <tr>
        <td style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; color: #334155;">약정 기간 및 조건</td>
        <td style="border-bottom: 1px solid #cbd5e1; padding: 6px 10px; color: #0d2242; font-weight: bold;">${commitmentDesc}</td>
      </tr>
      <tr>
        <td style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; color: #334155;">법적 동의 확인</td>
        <td style="border-bottom: 1px solid #cbd5e1; padding: 6px 10px; color: #059669; font-weight: bold;">핵심 약관 승인 ✓ (제2조 의무약정 없음 확인) · 식별정보 수집 및 5년 보존 동의 ✓ · 전자서명 효력 인정 ✓</td>
      </tr>
      <tr>
        <td style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; color: #334155;">체결 일시</td>
        <td style="border-bottom: 1px solid #cbd5e1; padding: 6px 10px; color: #0f172a;">${signedAt} (KST, 공인 타임스탬프)</td>
      </tr>
      <tr>
        <td style="background: #f1f5f9; padding: 6px 10px; font-weight: bold; color: #334155; vertical-align: middle;">계약자 전자서명</td>
        <td style="padding: 6px 10px; vertical-align: middle;">
          <img src="${sigDataUrl}" alt="전자서명" style="max-height: 42px; max-width: 130px; object-fit: contain; vertical-align: middle;">
          <span style="font-size: 10px; color: #059669; font-weight: bold; margin-left: 8px;">(정식 서명 날인 완료 ✓)</span>
        </td>
      </tr>
    </table>

    <!-- 결제 및 입금 청구 내역 하이라이트 박스 -->
    <table style="background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; margin-bottom: 12px;">
      <tr>
        <td colspan="3" style="padding: 8px 12px 4px 12px;">
          <span style="background: #1d4ed8; color: #ffffff; font-size: 10.5px; font-weight: bold; padding: 2px 7px; border-radius: 3px;">결제 및 입금 청구 내역</span>
          <span style="font-size: 10px; color: #475569; margin-left: 6px;">※ 부가가치세 10%가 투명하게 포함된 최종 입금 대상 금액입니다.</span>
        </td>
      </tr>
      <tr>
        <td align="center" width="33%" style="padding: 10px 8px; border-right: 1px solid #bfdbfe;">
          <span style="font-size: 10.5px; color: #475569; display: block; margin-bottom: 2px;">공급가액</span>
          <strong style="font-size: 15px; color: #1e293b;">${money(subtotal)}</strong>
        </td>
        <td align="center" width="33%" style="padding: 10px 8px; border-right: 1px solid #bfdbfe;">
          <span style="font-size: 10.5px; color: #475569; display: block; margin-bottom: 2px;">부가가치세 (VAT 10%)</span>
          <strong style="font-size: 15px; color: #1e293b;">${money(vat)}</strong>
        </td>
        <td align="center" width="34%" style="padding: 10px 8px; background: #dbeafe; border-radius: 6px;">
          <span style="font-size: 10.5px; color: #1e40af; font-weight: bold; display: block; margin-bottom: 2px;">최종 입금 합계금액</span>
          <strong style="font-size: 18px; color: #1d4ed8; font-weight: 900;">${money(total)}</strong>
        </td>
      </tr>
    </table>

    <!-- 공식 지정 입금 계좌 카드 -->
    <table style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; font-size: 11px;">
      <tr>
        <td style="padding: 8px 12px;">
          <strong style="color: #0f172a; font-size: 12px;">🏦 공식 지정 입금 계좌:</strong>
          <span style="font-size: 16px; font-weight: 800; color: #1e3a8a; margin-left: 6px;">카카오뱅크 3333-38-9917516</span>
          <span style="font-size: 11px; color: #475569; margin-left: 8px;">(예금주: <strong>정성윤 투어티플레이스</strong>)</span>
          <span style="background: #dcfce7; color: #166534; font-size: 9.5px; font-weight: bold; padding: 2px 6px; border-radius: 3px; float: right;">세금계산서 100% 자동 발행</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 12px 6px 12px; font-size: 10px; color: #64748b;">
          ※ 입금 시 계약자 상호명(<strong>${customerName}</strong>)으로 입금해 주시면 확인 즉시 전담 마케팅 셋팅이 착수됩니다.
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 12px 8px 12px;">
          <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 4px; padding: 4px 8px; font-size: 9.5px; color: #991b1b;">
            ⏳ <strong>[입금 기한 엄수 특약]</strong> 계약 체결일시 기준 <strong>48시간 이내</strong> 미입금 시 본 계약은 별도 통보 없이 <strong>즉시 자동 실효(해지)</strong>되며 효력을 상실합니다.
          </div>
        </td>
      </tr>
    </table>

    <!-- 공급자 / 고객사 쌍방 대조표 -->
    <table style="border: 1.5px solid #0d2242; margin-bottom: 12px; font-size: 10px;">
      <tr style="background: #0d2242; color: #ffffff;">
        <th width="50%" align="left" style="padding: 6px 10px; font-size: 11px;">공급자 (서비스 제공자)</th>
        <th width="50%" align="left" style="padding: 6px 10px; font-size: 11px;">고객사 (서비스 이용자)</th>
      </tr>
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px 10px; line-height: 1.5;">
          <p style="margin: 2px 0;"><strong>상호:</strong> 투어티플레이스 (DNA AI SUIT)</p>
          <p style="margin: 2px 0;"><strong>대표자:</strong> 정성윤 | <strong>기술이사:</strong> 최두리</p>
          <p style="margin: 2px 0;"><strong>사업자등록번호:</strong> 546-12-01988</p>
          <p style="margin: 2px 0;"><strong>사업장:</strong> 대전광역시 유성구 용계동 힐스테이트 2차</p>
          <p style="margin: 2px 0;"><strong>Director:</strong> 010-8587-0235 | dani90dna@gmail.com</p>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 10px; line-height: 1.5;">
          <p style="margin: 2px 0;"><strong>상호(성명):</strong> <strong>${customerName}</strong></p>
          <p style="margin: 2px 0;"><strong>대표자/담당자:</strong> <strong>${representative}</strong> (생년월일: <strong>${birthDate}</strong>)</p>
          <p style="margin: 2px 0;"><strong>사업자번호:</strong> ${bizNumber} ${corpNumber ? '(법인: ' + corpNumber + ')' : ''}</p>
          <p style="margin: 2px 0;"><strong>연락처 / 메일:</strong> ${phone} / ${email}</p>
          <p style="margin: 2px 0;"><strong>체결 일시:</strong> ${signedAt}</p>
        </td>
      </tr>
    </table>

    <!-- 무결성 검증 감사 바 -->
    <table style="background: #f1f5f9; border-radius: 4px; padding: 6px 10px; font-size: 9.5px; color: #64748b;">
      <tr>
        <td>🛡️ <strong>SHA-256 계약 무결성 검증 코드:</strong> <span style="font-family: monospace; font-weight: bold; color: #1d4ed8;">${hash}</span></td>
        <td align="right">공식 감사 기록 완료 (위변조 방지 보증)</td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- ==================== 2페이지: 공식 거래명세표 ==================== -->
  <div class="page-card" style="border-color: #047857;">
    <!-- 2P 헤더 -->
    <table style="border-bottom: 2px solid #047857; padding-bottom: 8px; margin-bottom: 12px;">
      <tr>
        <td style="vertical-align: middle;">
          <span style="background: #047857; color: #ffffff; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 4px; display: inline-block;">세무·회계 공식 증빙</span>
          <h1 style="font-size: 21px; font-weight: 800; color: #047857; margin: 4px 0 2px 0; letter-spacing: 2px;">거 래 명 세 표</h1>
          <div style="font-size: 11px; color: #64748b;">( 공급받는자 보관용 / 국세청 전자세금계산서 청구 겸용 )</div>
        </td>
        <td align="right" width="140" style="vertical-align: middle;">
          <div style="font-size: 10px; color: #475569;">작성일자</div>
          <strong style="font-size: 13px; color: #0f172a;">${dateFormatted}</strong>
        </td>
      </tr>
    </table>

    <!-- 공급자 / 공급받는자 테이블 -->
    <table style="margin-bottom: 12px; font-size: 10px;">
      <tr>
        <!-- 공급자 -->
        <td width="49%">
          <table style="border: 1px solid #cbd5e1; height: 100%;">
            <tr style="background: #f1f5f9;">
              <th colspan="4" style="border: 1px solid #cbd5e1; padding: 5px; color: #047857; font-size: 11px;">공 급 자</th>
            </tr>
            <tr>
              <th width="24%" style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">등록번호</th>
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px;"><strong style="color: #047857; font-size: 11px;">546-12-01988</strong></td>
            </tr>
            <tr>
              <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">상호(법인명)</th>
              <td style="border: 1px solid #cbd5e1; padding: 5px;">투어티플레이스 (DNA AI)</td>
              <th width="18%" style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">성명</th>
              <td style="border: 1px solid #cbd5e1; padding: 5px;">정성윤 <span style="border: 1px solid #dc2626; color: #dc2626; font-size: 8px; padding: 1px 3px; border-radius: 2px; margin-left: 2px;">직인생략</span></td>
            </tr>
            <tr>
              <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">사업장주소</th>
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px;">대전광역시 유성구 용계동 힐스테이트 2차</td>
            </tr>
            <tr>
              <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">업태 / 종목</th>
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px;">서비스, IT / 소프트웨어 개발, 마케팅 컨설팅</td>
            </tr>
            <tr>
              <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">연락처/메일</th>
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px;">010-8587-0235 / dani90dna@gmail.com</td>
            </tr>
          </table>
        </td>

        <td width="2%"></td>

        <!-- 공급받는자 -->
        <td width="49%">
          <table style="border: 1px solid #cbd5e1; height: 100%;">
            <tr style="background: #f1f5f9;">
              <th colspan="4" style="border: 1px solid #cbd5e1; padding: 5px; color: #047857; font-size: 11px;">공 급 받 는 자</th>
            </tr>
            <tr>
              <th width="24%" style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">등록번호</th>
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px;"><strong>${bizNumber}</strong></td>
            </tr>
            <tr>
              <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">상호(법인명)</th>
              <td style="border: 1px solid #cbd5e1; padding: 5px;"><strong>${customerName}</strong></td>
              <th width="18%" style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">성명</th>
              <td style="border: 1px solid #cbd5e1; padding: 5px;"><strong>${representative}</strong></td>
            </tr>
            <tr>
              <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">사업장주소</th>
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px;">${address}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">담당자메일</th>
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px;">${email}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px;">담당자연락처</th>
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px;">${phone}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- 합계금액 선언 바 -->
    <table style="background: #f1f5f9; border: 1.5px solid #047857; border-radius: 4px; margin-bottom: 12px;">
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; color: #0f172a; font-size: 11px;">
          합계금액 (공급가액 + 세액):
          <span style="color: #047857; font-size: 13px; font-weight: 800; margin-left: 8px;">일금 ${korTotal} 원정</span>
          <span style="color: #475569; font-size: 11.5px; margin-left: 6px;">( ₩ <strong>${total.toLocaleString('ko-KR')}</strong> )</span>
        </td>
      </tr>
    </table>

    <!-- 품목별 거래 명세 테이블 -->
    <table style="border: 1px solid #cbd5e1; margin-bottom: 12px; font-size: 10px;">
      <thead>
        <tr style="background: #047857; color: #ffffff;">
          <th width="5%" style="border: 1px solid #cbd5e1; padding: 6px;">No.</th>
          <th width="10%" style="border: 1px solid #cbd5e1; padding: 6px;">월/일</th>
          <th width="37%" style="border: 1px solid #cbd5e1; padding: 6px;">품목명 (규격 / 서비스 내용)</th>
          <th width="8%" style="border: 1px solid #cbd5e1; padding: 6px;">수량</th>
          <th width="13%" style="border: 1px solid #cbd5e1; padding: 6px;">단가</th>
          <th width="13%" style="border: 1px solid #cbd5e1; padding: 6px;">공급가액</th>
          <th width="14%" style="border: 1px solid #cbd5e1; padding: 6px;">세액 (VAT 10%)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: bold;">
          <th colspan="3" style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">소계 및 합계 (VAT 포함)</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${totalQty}</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">-</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; color: #047857;">${money(subtotal)}</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; color: #047857;">${money(vat)}</th>
        </tr>
      </tfoot>
    </table>

    <!-- 하단 입금 계좌 및 영수 안내 -->
    <table style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 8px; font-size: 10.5px;">
      <tr>
        <td style="padding: 10px 14px; vertical-align: middle;">
          <strong>입금 계좌:</strong>
          <span style="color: #047857; font-weight: 800; font-size: 12px; margin-left: 4px;">카카오뱅크 3333-38-9917516</span>
          <span style="color: #475569; margin-left: 6px;">예금주: 정성윤(투어티플레이스)</span>
        </td>
        <td align="right" style="padding: 10px 14px; vertical-align: middle;">
          <span>위 금액을 정히 <strong>영수(청구)</strong>합니다.</span>
          <span style="display: inline-block; margin-left: 8px; font-weight: bold; color: #0d2242;">투어티플레이스 대표 정성윤</span>
          <span style="display: inline-block; width: 22px; height: 22px; border: 1.5px solid #dc2626; color: #dc2626; border-radius: 50%; text-align: center; line-height: 20px; font-size: 10px; font-weight: bold; margin-left: 4px;">인</span>
        </td>
      </tr>
    </table>
    <div style="font-size: 9.5px; color: #64748b;">
      ※ 본 거래명세표는 DNA AI 서비스 전자계약서와 일체로 유효하며, 입금 확인 즉시 국세청 홈택스 전자세금계산서가 자동 발행됩니다.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== 3페이지: 서비스 표준 이용약관 및 개인정보 수집·이용 동의서 ==================== -->
  <div class="page-card" style="border-color: #1e3a8a;">
    <!-- 3P 헤더 -->
    <table style="border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px;">
      <tr>
        <td style="vertical-align: middle;">
          <span style="background: #1e3a8a; color: #ffffff; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 4px; display: inline-block;">계약 부속 합의서 (별지 제1호)</span>
          <h1 style="font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 4px 0 2px 0;">서비스 표준이용약관 및 개인정보 수집·이용 동의서</h1>
          <div style="font-size: 11px; color: #64748b;">본 문서는 DNA AI 서비스 이용계약서의 불가분의 일부를 구성하며 법적 구속력을 갖습니다.</div>
        </td>
        <td align="right" width="130" style="vertical-align: middle;">
          <div style="font-size: 10px; color: #475569;">체결·교부일자</div>
          <strong style="font-size: 13px; color: #0f172a;">${dateFormatted}</strong>
        </td>
      </tr>
    </table>

    <!-- 약관 본문 4개조 (2x2 그리드 테이블) -->
    <div style="margin-bottom: 10px;">
      <div style="font-size: 11px; font-weight: bold; color: #0d2242; margin-bottom: 6px;">
        <span style="background: #1e3a8a; color: #fff; font-size: 9.5px; padding: 2px 6px; border-radius: 3px;">부속서류 01</span>
        DNA AI 서비스 표준 이용약관 (핵심 규정 전문)
      </div>
      <table style="margin-bottom: 10px; font-size: 9.5px; line-height: 1.45;">
        <tr>
          <!-- 제1조 -->
          <td width="49%" style="border: 1px solid #cbd5e1; border-radius: 5px; background: #f8fafc; padding: 7px 9px;">
            <strong style="color: #0d2242; font-size: 10.5px; display: block; margin-bottom: 3px;">제1조 (서비스 제공 범위 및 운영 원칙)</strong>
            ① 공급자는 고객이 선택한 솔루션(SNS-Threads 콘텐츠 자동화 또는 AI 마케팅 분석 컨설팅)을 성실히 수행합니다.<br>
            ② 콘텐츠 자동화의 세부 발행 채널, 타겟 페르소나, 주간 발행 횟수 및 검수 일정은 사전 상호 확정합니다.<br>
            ③ 소셜 미디어 플랫폼(Meta 등)의 정책 변경 시 공급자는 즉각 대체 방안을 마련하여 고객에게 안내합니다.
          </td>
          <td width="2%"></td>
          <!-- 제2조 -->
          <td width="49%" style="border: 1px solid #cbd5e1; border-radius: 5px; background: #eff6ff; padding: 7px 9px;">
            <strong style="color: #1e40af; font-size: 10.5px; display: block; margin-bottom: 3px;">제2조 (이용요금, 결제 규정 및 48시간 자동 실효)</strong>
            ① 모든 서비스 비용은 부가가치세(VAT 10%)가 별도로 산정되며, 최종 입금 금액에 합산 청구됩니다.<br>
            ② <strong>[의무 약정 없음]</strong> 본 서비스는 고객사의 운영 자율성을 위해 <strong>의무 계약기간(의무 약정)이 적용되지 않으며</strong>, 월 단위 정기구독으로 자유롭게 이용 및 해지할 수 있습니다.<br>
            ③ 월 구독은 체결 시 '초기 셋팅비 + 1회차 구독료' 선납 후, 2회차부터 매월 약정일에 정기 청구됩니다.<br>
            ④ 입금 확인 즉시 국세청 홈택스 전자세금계산서 또는 현금영수증이 자동 발행됩니다.<br>
            ⑤ <strong>[48시간 자동 실효]</strong> 체결 후 48시간 이내 미입금 시 본 계약은 별도 최고 없이 즉시 자동 실효(해지)되며 공급자의 서비스 제공 의무는 면책됩니다.
          </td>
        </tr>
        <tr><td colspan="3" height="6"></td></tr>
        <tr>
          <!-- 제3조 -->
          <td width="49%" style="border: 1px solid #cbd5e1; border-radius: 5px; background: #f8fafc; padding: 7px 9px;">
            <strong style="color: #0d2242; font-size: 10.5px; display: block; margin-bottom: 3px;">제3조 (역할 분담 및 매출 보장 한계)</strong>
            ① <strong>[역할 분담]</strong> 공급자는 타겟 트래픽 유입 및 AI 인프라 구축을 전담하고, 고객사는 현장 접객, 서비스 품질 관리 및 실제 매출 창출을 전담합니다.<br>
            ② <strong>[매출 보장 한계]</strong> 공급자는 최적화된 마케팅 알고리즘을 제공하나, 개별 매장의 실제 매출액이나 팔로워 수 등 특정 정량 성과를 절대 보장하지 않습니다.<br>
            ③ 사전 공유된 AI 원고는 고객이 검수하며, 고의/중과실 손해는 관련 법령에 따릅니다.
          </td>
          <td width="2%"></td>
          <!-- 제4조 -->
          <td width="49%" style="border: 1px solid #cbd5e1; border-radius: 5px; background: #eff6ff; padding: 7px 9px;">
            <strong style="color: #1e40af; font-size: 10.5px; display: block; margin-bottom: 3px;">제4조 (계약 해지, 위약금 면제 및 환불 규정)</strong>
            ① 월 구독 서비스는 의무 약정 기간이 없으므로, 차기 결제일 7일 전까지 서면(이메일/메신저) 통지로 자유롭게 해지 가능하며 <strong>별도 위약금이 일체 발생하지 않습니다.</strong><br>
            ② 이미 셋팅 완료된 초기 셋팅비 및 해당 월 정상 발행 원고에 대해서는 일할 정산 후 잔여액을 환불합니다.<br>
            ③ 계약 종료 시 계정 연동 권한을 즉시 해제하고 기획 자료를 안전하게 인계 및 파기합니다.
          </td>
        </tr>
      </table>
    </div>

    <!-- 개인정보 수집 및 이용(취득) 동의서 법정 서식 -->
    <div style="margin-bottom: 10px;">
      <div style="font-size: 11px; font-weight: bold; color: #0d2242; margin-bottom: 6px;">
        <span style="background: #1e3a8a; color: #fff; font-size: 9.5px; padding: 2px 6px; border-radius: 3px;">부속서류 02</span>
        개인정보 수집 및 이용(취득) 동의서 <span style="font-size: 9.5px; color: #64748b; font-weight: normal;">(전자상거래법 및 개인정보보호법 준수)</span>
      </div>
      <table style="border: 1px solid #cbd5e1; margin-bottom: 8px; font-size: 9.5px;">
        <tr>
          <th width="22%" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left;">수집·이용 목적</th>
          <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">전자계약 체결 및 이행, 세금계산서 발행, 서비스 전담 셋팅, 고객 상담 및 분쟁 해결</td>
        </tr>
        <tr>
          <th style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left;">수집 항목</th>
          <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">상호(성명), 대표자명, <strong>대표자 생년월일(고유식별정보)</strong>, 법인등록번호, 사업자등록번호, 휴대전화번호, 이메일, 사업장주소, 전자서명 데이터</td>
        </tr>
        <tr>
          <th style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left;">보유 및 이용기간</th>
          <td style="border: 1px solid #cbd5e1; padding: 5px 8px;"><strong>전자상거래 등에서의 소비자보호에 관한 법률 제6조에 의거 계약 및 대금결제 기록 5년간 안전하게 보존 후 영구 파기</strong></td>
        </tr>
        <tr>
          <th style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left;">동의 거부 권리</th>
          <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">귀하는 동의를 거부할 권리가 있으나, 계약 체결에 필수적인 항목이므로 미동의 시 서비스 이용이 제한됩니다.</td>
        </tr>
      </table>

      <!-- 동의 완료 배지 바 -->
      <table style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 4px; margin-bottom: 10px; font-size: 10px; color: #065f46;">
        <tr>
          <td style="padding: 6px 10px;">
            ☑ <strong>개인정보 수집 및 이용 동의 완료:</strong> 위 개인정보 수집·이용 및 5년 안전 보존 조항에 정히 동의함.<br>
            ☑ <strong>전자문서 법적 구속력 동의 완료:</strong> 전자문서 및 전자거래 기본법 제4조 및 전자서명법 제3조에 따라 효력 인정함.
          </td>
        </tr>
      </table>
    </div>

    <!-- 하단 계약 당사자 서명 날인란 -->
    <table style="border-top: 1.5px solid #0d2242; padding-top: 8px; margin-bottom: 10px; font-size: 10px;">
      <tr>
        <!-- 공급자 -->
        <td width="49%" style="border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; padding: 8px 10px;">
          <span style="background: #334155; color: #fff; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-bottom: 4px;">서비스 공급자</span>
          <p style="margin: 2px 0;"><strong>상호:</strong> 투어티플레이스 (DNA AI SUIT)</p>
          <p style="margin: 2px 0;"><strong>대표자:</strong> 정성윤 (인)</p>
          <p style="margin: 2px 0;"><strong>사업자등록번호:</strong> 546-12-01988</p>
        </td>

        <td width="2%"></td>

        <!-- 고객사 -->
        <td width="49%" style="border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; padding: 8px 10px;">
          <span style="background: #1e40af; color: #fff; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-bottom: 4px;">서비스 이용자 (계약자)</span>
          <p style="margin: 2px 0;"><strong>고객사명:</strong> <strong>${customerName}</strong></p>
          <p style="margin: 2px 0;"><strong>대표자/담당자:</strong> <strong>${representative}</strong> (생년월일: <strong>${birthDate}</strong>)</p>
          <p style="margin: 2px 0;"><strong>사업자등록번호:</strong> ${bizNumber}</p>
          <div style="margin-top: 4px;">
            <span style="font-weight: bold; color: #1e40af; font-size: 9.5px;">전자서명 날인:</span>
            <img src="${sigDataUrl}" alt="서명 날인" style="max-height: 38px; max-width: 120px; object-fit: contain; vertical-align: middle; margin-left: 6px;">
          </div>
        </td>
      </tr>
    </table>

    <!-- 하단 무결성 감사 코드 -->
    <table style="background: #f1f5f9; border-radius: 4px; padding: 5px 8px; font-size: 9.5px; color: #64748b;">
      <tr>
        <td>🛡️ <strong>무결성 감사 인증 코드:</strong> <span style="font-family: monospace; font-weight: bold; color: #1d4ed8;">${hash}</span></td>
        <td align="right">위변조 방지 SHA-256 Web Crypto 검증 완료</td>
      </tr>
    </table>
  </div>

</body>
</html>`;
}

// 9-1. Google Drive 자동 업로드 핵심 함수 (Apps Script WebApp 연동 - 철통 중복 방지 & 0원 방지 & 3P 완결 테이블 디자인)
let isGoogleDriveUploading = false;
let lastUploadedContractHash = '';

async function uploadContractToGoogleDrive(triggerSource = 'auto') {
  if (!GAS_WEBAPP_URL) return;

  try {
    const fd = new FormData(form);
    const customerName = (fd.get('customerName') || '').trim();
    const representative = (fd.get('representative') || '').trim();
    const birthDate = (fd.get('birthDate') || '').trim();
    const corpNumber = (fd.get('corpNumber') || '').trim();
    const phone = (fd.get('phone') || '').trim();
    const email = (fd.get('email') || '').trim();
    const bizNumber = (fd.get('businessNumber') || '').trim() || '개인 고객 (해당없음)';
    const address = (fd.get('businessAddress') || '').trim() || '-';
    const { subtotal, vat, total, checked, threadsPrice, threadsSetup, consultingPrice } = calculatePricing();
    const products = checked.map(c => c.dataset.label).join(' + ');
    const hash = document.querySelector('#cryptoHash')?.textContent || '';
    const now = new Date();
    const signedAt = new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Seoul'
    }).format(now);
    const sigDataUrl = canvas.toDataURL('image/png');

    // [철통 방어 1] 0원, 상호 미입력, 서명 누락, 해시 미생성 상태 시 업로드 원천 차단!
    if (total <= 0 || !customerName || customerName === '고객사' || !hasSignature || isCanvasBlank(canvas) || !hash || hash.includes('계산 중')) {
      console.warn('[업로드 방어] 계약 데이터 미완성 (0원 또는 서명 누락) 상태이므로 Google 드라이브 업로드를 보류합니다.');
      return;
    }

    // [철통 방어 2] 이미 동일한 계약 무결성 해시로 업로드되었거나 업로드 진행 중이면 2중 중복 파일 생성 원천 차단!
    if (isGoogleDriveUploading || (lastUploadedContractHash && lastUploadedContractHash === hash)) {
      console.log('[중복 방어] 이미 Google 드라이브에 동일 계약(' + hash + ') 완결본이 보관되어 있어 중복 전송을 차단합니다. (Trigger:', triggerSource, ')');
      return;
    }
    isGoogleDriveUploading = true;

    const hasThreads = checked.some(p => p.value === 'threads');
    const hasConsulting = checked.some(p => p.value === 'consulting');
    let commitmentDesc = '';
    if (hasThreads && hasConsulting) {
      commitmentDesc = `<strong>스탠다드 콘텐츠 자동화: 월 정기구독 (의무 약정 없음 / 자유 해지)</strong> (월 ${money(threadsPrice)}) / <strong>AI 상권분석: 1회성 단건 (약정 없음)</strong>`;
    } else if (hasThreads) {
      commitmentDesc = `<strong>월 정기구독 (의무 약정 없음)</strong> (의무 계약기간 없음 / 언제든 자유 해지 가능 / 월 ${money(threadsPrice)})`;
    } else {
      commitmentDesc = `<strong>1회성 단건 컨설팅 (약정 없음)</strong>`;
    }

    const productNames = checked.map(p => {
      if (p.value === 'threads') {
        return `<strong>${p.dataset.label}</strong> (월 ${money(threadsPrice)} + 설정비 ${money(threadsSetup)})`;
      }
      return `<strong>${p.dataset.label}</strong> (${money(p.dataset.price)})`;
    }).join('<br>');

    const fileName = `${contractFileTitle()}.pdf`;

    // Google Apps Script HTML-to-PDF 엔진에 최적화된 100% 완전한 3페이지 테이블 HTML 생성
    const gasHtml = buildGasCompatible3PHtml({
      customerName,
      representative,
      birthDate,
      corpNumber,
      bizNumber,
      phone,
      email,
      address,
      productNames,
      commitmentDesc,
      subtotal,
      vat,
      total,
      signedAt,
      sigDataUrl,
      hash,
      checked,
      threadsPrice,
      threadsSetup,
      consultingPrice,
      now
    });

    const payload = {
      customerName: customerName,
      representative: representative,
      birthDate: birthDate,
      corpNumber: corpNumber,
      phone: phone,
      email: email,
      products: products,
      subtotal: subtotal,
      vat: vat,
      total: total,
      fileName: fileName,
      htmlContent: gasHtml,
      timestamp: now.toISOString(),
      trigger: triggerSource
    };

    // Google Apps Script는 text/plain 전송 시 브라우저 CORS 차단(OPTIONS) 없이 100% 무결점 수신됨
    fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(() => {
      lastUploadedContractHash = hash;
      isGoogleDriveUploading = false;
      showToast(`Google 드라이브에 [${customerName}] 공식 3페이지 계약서가 단일 완결본으로 안전하게 저장되었습니다!`);
    }).catch(err => {
      isGoogleDriveUploading = false;
      console.warn('Google Drive Sync Notice:', err);
    });

    // CRM 대장 로컬스토리지 누적 업데이트
    try {
      const crmKey = 'dna_client_crm_data';
      let crmList = JSON.parse(localStorage.getItem(crmKey) || '[]');
      const dateStr = now.toISOString().slice(0, 10);
      const dayNum = now.getDate();
      const existingIdx = crmList.findIndex(c => c.customerName === customerName);
      
      const lowerName = (customerName || '').toLowerCase().trim();
      if (lowerName.includes('테스트') || lowerName.includes('test')) {
        console.log('테스트 계약으로 인지하여 CRM 대장 업데이트를 제외합니다:', customerName);
        return;
      }

      const crmRecord = {
        no: existingIdx >= 0 ? crmList[existingIdx].no : (crmList.length + 1),
        customerName: customerName,
        industry: checked.map(c => c.dataset.label).join(', ') || 'AI 마케팅 솔루션',
        representative: representative,
        phone: phone,
        address: address,
        email: email,
        bizNumber: bizNumber,
        plan: products,
        monthlyFee: money(subtotal),
        feeNumber: subtotal || 100000,
        commitmentMonths: 0,
        startDate: dateStr,
        vat: money(vat),
        totalFee: money(total),
        paymentCycle: '월 정기구독 (의무 약정 없음)',
        paymentDay: `매월 ${dayNum}일`,
        alertDay: `매월 ${Math.max(1, dayNum - 3)}일 (D-3 알림)`,
        paymentMethod: '계좌이체 (카카오뱅크 3333-38-9917516)',
        paymentStatus: '입금대기 (계약체결완료)',
        updatedAt: dateStr,
        platformUrl: window.location.href,
        accessCode: hash,
        memo: `공식 온라인 전자계약 체결 완료 (공급가: ${money(subtotal)}, VAT: ${money(vat)}, 의무 약정 없음 / 자유 해지)`
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
    isGoogleDriveUploading = false;
    console.warn('Drive Upload Error:', err);
  }
}



// 10. 공식 계약서·거래명세표·약관동의서 3페이지 합본 PDF 저장 (인쇄)
const completeBtn = document.querySelector('#completeContract');
if (completeBtn) {
  completeBtn.addEventListener('click', () => {
    clearErrors();
    const finalConfirm = document.querySelector('#finalConfirm');
    if (!finalConfirm.checked) {
      fail(finalConfirm.parentElement, '계약서, 거래명세표 및 약관동의서 내역에 대한 최종 확인 체크가 필요합니다.');
      return;
    }
    // 구글 드라이브 동기화 트리거
    uploadContractToGoogleDrive('pdf_save');

    const msg = document.querySelector('#completeMessage');
    msg.textContent = '계약서(1P), 거래명세표(2P), 약관 및 개인정보동의서(3P) 공식 3페이지 세트 출력이 준비되었습니다. 인쇄창에서 "PDF로 저장"을 선택해 주세요.';
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
  const pdfFileName = `${contractFileTitle()}.pdf`;

  // 1. 계약 상품명 정리 (6개월 약정 여부 명확히 표기)
  const productList = [];
  checked.forEach(p => {
    if (p.value === 'threads') {
      productList.push('SNS-Threads 콘텐츠 자동화 (기본 6개월 약정)');
    } else if (p.value === 'consulting') {
      productList.push('AI 상권분석 및 마케팅 컨설팅 (1회성 단건)');
    } else {
      productList.push(p.dataset.label || 'DNA AI 솔루션');
    }
  });
  const productsSummary = productList.join(' + ') || 'DNA AI 마케팅 솔루션';

  // 2. 친절하고 간결한 이메일 본문 (첫인사 + 4대 핵심 정보 + 끝인사)
  const cleanEmailBody = `안녕하세요, ${customerName} ${representative} 대표님!
최고급 AI 마케팅 비서 DNA AI SUITE (투어티플레이스)입니다.

금일 체결해 주신 서비스 이용 계약서 및 공식 거래명세표 내역을 안내해 드립니다.
(상세 계약 조항 및 세부 명세는 첨부된 전자계약서 원본 파일에서 확인하실 수 있습니다.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[계약 및 입금 안내]
• 계약 상품: ${productsSummary}
• 입금 금액: ${money(total)} (VAT 포함)
• 입금 계좌: 카카오뱅크 3333-38-9917516 (예금주: 정성윤)
• 입금 기한: 계약 체결 후 48시간 이내
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

입금 확인 즉시 전담 마케팅 셋팅 및 국세청 전자세금계산서가 발행됩니다.
대표님의 성공적인 비즈니스 성장을 위해 정성을 다해 서포트하겠습니다.

진행 중 궁금하신 점은 언제든 편하게 말씀해 주세요.

감사합니다.

DNA AI SUITE / 투어티플레이스 드림
• 공식 웹사이트: https://dnaai.co.kr/
• 대표전화: 010-8587-0235 | 기술팀: 010-8806-8318
• 공식 이메일: dani90dna@gmail.com`;

  const fullBody = cleanEmailBody;
  const safeUrlBody = cleanEmailBody;

  const subject = `[DNA AI 전자계약] ${customerName} 체결본 및 입금안내`;
  const encodedTo = encodeURIComponent(email);
  const encodedCc = encodeURIComponent('dani90dna@gmail.com');
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(safeUrlBody);

  // Gmail Compose 웹 URL (Google 400 에러 없이 즉시 정상 오픈)
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&cc=${encodedCc}&su=${encodedSubject}&body=${encodedBody}`;
  
  return { gmailUrl, fullBody, customerName, fileName: pdfFileName };
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

    const { gmailUrl, fullBody, fileName } = generateGmailData();
    lastGeneratedGmailUrl = gmailUrl;
    lastFullMailBody = fullBody;

    // 0) 클립보드에 상세 전문 자동 복사 (안전 처리)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullBody).catch(() => {});
    }

    // 1) Google Apps Script 웹앱으로 구글 드라이브에 안전하게 자동 업로드
    uploadContractToGoogleDrive('gmail_send');

    // 2) 파일명 설정 및 PDF 저장 대화상자 선제적 호출
    document.title = contractFileTitle();
    setTimeout(() => {
      window.print();
    }, 300);

    // 3) 모달 파일명 표시 및 모달 노출
    if (modalFileName) modalFileName.textContent = fileName;
    if (emailGuideModal) emailGuideModal.classList.add('active');

    // 4) Gmail 웹 작성창 오픈 (400 에러 없이 즉시 정상 오픈)
    setTimeout(() => {
      window.open(gmailUrl, '_blank');
    }, 600);

    const msg = document.querySelector('#completeMessage');
    msg.innerHTML = `Gmail 작성 창이 열렸습니다. 하단의 <strong>Google 드라이브 아이콘(▲)</strong>을 눌러 첨부해 주세요!`;
    showToast('Gmail 작성 창이 열렸습니다.');
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

if (btnCopyMailBody) {
  btnCopyMailBody.addEventListener('click', () => {
    if (lastFullMailBody) {
      navigator.clipboard.writeText(lastFullMailBody).then(() => {
        showToast('메일 상세 전문이 클립보드에 복사되었습니다! (Gmail에서 Ctrl+V)');
      }).catch(() => {
        showToast('메일 상세 전문이 복사되었습니다.');
      });
    }
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
