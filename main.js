class LottoBall extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const number = this.getAttribute('number');
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: var(--ball-color, oklch(80% 0.1 250));
          color: white;
          font-size: 2rem;
          font-weight: bold;
          display: grid;
          place-items: center;
          box-shadow: 
            0 4px 8px rgba(0,0,0,0.2),
            0 6px 20px rgba(0,0,0,0.19);
          animation: reveal 0.5s ease-out;
          animation-fill-mode: backwards;
        }

        @keyframes reveal {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      </style>
      <span>${number}</span>
    `;
  }
}

customElements.define('lotto-ball', LottoBall);


document.getElementById('generate-btn').addEventListener('click', () => {
  const lottoNumbersContainer = document.getElementById('lotto-numbers');
  lottoNumbersContainer.innerHTML = '';

  const numbers = new Set();
  while (numbers.size < 6) {
    numbers.add(Math.floor(Math.random() * 45) + 1);
  }

  const sortedNumbers = [...numbers].sort((a, b) => a - b);

  sortedNumbers.forEach((number, index) => {
    setTimeout(() => {
      const lottoBall = document.createElement('lotto-ball');
      lottoBall.setAttribute('number', number);
      
      let color;
      if (number <= 10) color = 'yellow';
      else if (number <= 20) color = 'blue';
      else if (number <= 30) color = 'red';
      else if (number <= 40) color = 'grey';
      else color = 'green';
      lottoBall.setAttribute('data-color', color);

      lottoNumbersContainer.appendChild(lottoBall);
    }, index * 200);
  });
});
