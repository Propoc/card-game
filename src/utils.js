function FanTheCards({
  hand,
  angleSpread = 15,  
  way = 0 // 0 is circular, 1 is smooth sine  
}) {

  let approach = way;
  let cardWidth = 200; //HARD CODED
  let cardOverlap = 0.6;  //How many percent covers the other card
  let output = [];

  // Enhanced circular arc approach for better visual appeal
  function circularArcApproach() {
    const cardDistance = cardWidth * (1 - cardOverlap);
    const totalCards = hand.length;
    const totalAngle = angleSpread * 2; // Total spread angle in degrees
    
    // Calculate radius for a more natural arc
    const handSpan = cardDistance * (totalCards - 1);
    let radius;
    

    // Prevent division by zero when angleSpread is 0 or only one card
    if (angleSpread === 0 || totalCards === 1) {
      radius = Infinity; // Cards will be in a straight line or single card centered
    } else {
      radius = handSpan / (2 * Math.sin(totalAngle * Math.PI / 360));
    }

    hand.forEach((card, index) => {

      
  let valx, valy, rot;

      if (totalCards === 1) {
        // Center the single card, no rotation
        valx = 0;
        valy = 0;
        rot = 0;
      } else {
        // Calculate angle for this card (-totalAngle/2 to +totalAngle/2)
        const angleStep = totalAngle / (totalCards - 1);
        const cardAngle = -totalAngle / 2 + (index * angleStep);
        const radians = cardAngle * Math.PI / 180;

        if (!isFinite(radius)) {
          valx = cardDistance * (index - (totalCards - 1) / 2);
          valy = 0;
        } else {
          valx = radius * Math.sin(radians);
          valy = radius - radius * Math.cos(radians);
        }
        rot = cardAngle;
      }

      output[index] = [valx, valy - 110, rot];
    });
    
    return output;
  }
  function smoothSineApproach() {
      const cardDistance = cardWidth * (1 - cardOverlap);
      const totalCards = hand.length;
      const handWidth = cardDistance * (totalCards - 1);
      
      // Use sine wave for smoother, more organic curves
      const maxHeight = handWidth * Math.tan(angleSpread * Math.PI / 180) / 2;
      
      hand.forEach((card, index) => {
        const progress = index / (totalCards - 1); // 0 to 1
        const normalizedX = progress * 2 - 1; // -1 to 1
        
        const valx = normalizedX * handWidth / 2;
        
        // Sine-based height for smoother curve
        const valy = -Math.abs(Math.sin(progress * Math.PI)) * maxHeight;
        
        // Smoother rotation based on position
        const maxRotation = angleSpread;
        const rot = normalizedX * maxRotation;
        
        output[index] = [valx, valy-30, rot];
      });
      
      return output;
    }

    
  // Choose approach based on parameter
  switch(approach) {
    case 0:
      return circularArcApproach();
    case 1:
      return smoothSineApproach();
    default:
      return circularArcApproach();
  }

}












function fanOpponents({ index, total, arcHeight = 60 }) {
  const center = (total - 1) / 2;
  const x = (index - center) / center;
  const y = arcHeight * (x * x);
  return { y };
}


function sortHand(hand, sortAsc = true) {
  const cardOrder = ['1', 'k', 'q', 'j', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  function cardRank(card) {
    const val = card.substring(1).toLowerCase();
    const idx = cardOrder.indexOf(val);
    return idx === -1 ? 100 : idx;
  }
  return [...hand].sort((a, b) => {
    const rankA = cardRank(a);
    const rankB = cardRank(b);
    return sortAsc ? rankA - rankB : rankB - rankA;
  });
}

function getPlayerGlowShadow(color) {
  return `
    0 0 24px 4px ${color}, /* colored glow */
    0 4px 12px 0 rgba(31,38,135,0.37), /* soft shadow */
    0 0 0 4px white /* subtle white border */
  `;
}

export {
    FanTheCards,
    fanOpponents,
    sortHand,
    getPlayerGlowShadow
};
