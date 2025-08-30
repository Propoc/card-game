// npm run start
// npm run dev (sw)


// client/src/App.js
import React, { useState, useEffect, useRef} from 'react';
import { motion } from "framer-motion";
import { socket } from "./socket";

import { generateGoldenRatioColors} from './hue';
import { FanTheCards, fanOpponents, sortHand, getPlayerGlowShadow } from './utils';
import { TopBar, Sidebar , Lobby} from './helperdivs'
//import * as anim from './anims';




const Card = function Card(
  {cardValue, onClick = null , selected = false, className = "" , styleExtra , 
    initial, animate, transition, isExiting = false , holding = false , jumpInPulse}
  ) {

  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const imgSrc = `/card_icons/${cardValue}.jpg`;
  const width = 200; // 96 DEFAULT NERDEN GELİYO BİLMİYOM 

  const parentCenter = { x: 0, y: -800 };

  const isS3 = cardValue === "s3";

  const outlineStyle = selected
    ? '4px solid red'
    : isS3 && typeof onClick === 'function'
      ? '4px solid limegreen'
      : 'none';

  const handleMouseEnter = () => {if (onClick) setHovered(true); };
  const handleMouseLeave = () => { setHovered(false); };

  const handleClick = () => {
    if (onClick && !isExiting) {
      setClicked(true);
      onClick();
      setTimeout(() => setClicked(false), 200); // Reset click animation
    }
  };


  let finalAnimate
  let finalTransition
  
  // Debug log for jumpInPulse and cardValue
  if (holding) {
    const baseX = animate?.x ?? 0;
    const baseY = animate?.y ?? 0;
    const baseRotate = animate?.rotate ?? 0;
    const baseScale = animate?.scale ?? 1;

    const selectedScale = selected ? 0.2 : 0;
    const selectedY = selected ? -20 : 0;
    const hoverDelta = hovered && !isExiting && !selected ? {
      scale: 0.2, // +20%
      rotate: [0, -2, 2, -2, 0], // wiggle
      y: -20, // up
    } : {};
    const clickDelta = clicked ? {
      scale: [-0.1, -0.1, 0.1], // -20%, then +10%
    } : {};

    const exitDelta = isExiting ? {
      x: parentCenter.x - baseX,
      y: parentCenter.y - baseY,
      scale: -0.7, // to 0.3
      opacity: -1, // to 0
      rotate: 360 - baseRotate,
    } : {};

    // Whoosh-whoosh animation for jump-in pulse
    let whooshDelta = {};
    if (jumpInPulse !== "" && cardValue.slice(1) === jumpInPulse) {
      whooshDelta = {
        x: [baseX, baseX + 20, baseX - 15, baseX + 15, baseX - 25, baseX + 5, baseX],
        y: [baseY, baseY - 10, baseY + 8, baseY - 12, baseY + 14, baseY, baseY],
        scale: [1, 1.25, 0.95, 1.18, 0.9, 1.1, 1],
        rotate: [baseRotate, baseRotate + 10, baseRotate - 12, baseRotate + 8, baseRotate - 15, baseRotate + 5, baseRotate],
      };
    }

    const finalScale = Array.isArray(clickDelta.scale)
      ? clickDelta.scale.map(
          s => baseScale + s + (hoverDelta.scale || 0) + selectedScale + (exitDelta.scale || 0)
        )
      : baseScale + (hoverDelta.scale || 0) + selectedScale + (clickDelta.scale || 0) + (exitDelta.scale || 0);

    finalAnimate = {
      x: whooshDelta.x || (baseX + (exitDelta.x || 0)),
      y: whooshDelta.y || (baseY + (hoverDelta.y || 0) + (exitDelta.y || 0) + selectedY),
      rotate: whooshDelta.rotate || (Array.isArray(hoverDelta.rotate)
        ? hoverDelta.rotate.map(r => baseRotate + r + (exitDelta.rotate || 0))
        : baseRotate + (hoverDelta.rotate || 0) + (exitDelta.rotate || 0)),
      scale: whooshDelta.scale || finalScale,
      opacity: isExiting ? 0 : 1,
    };

    finalTransition = (whooshDelta.x ? { duration: 0.35, repeat: 3, repeatType: "mirror", ease: "easeInOut" } :
      isExiting 
        ? { duration: 0.3, ease: "easeInOut" }
        : clicked 
          ? { duration: 0.2, times: [0, 0.5, 1] }
          : hovered 
            ? { duration: 0.15, ease: "easeOut" }
            : transition
    );
  }
  else
  {
    finalAnimate = animate;
    finalTransition = transition;
  }


  return (
    <motion.div
      className={`cursor-pointer rounded-xl absolute shadow-lg overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        width: width,
        height: width * 1.4,
        zIndex: 2,
        outline: outlineStyle,
        ...styleExtra
      }}
      initial={initial}
      animate={finalAnimate}
      transition={finalTransition}
    >
      <img
        src={imgSrc}
        alt={`card-${cardValue}`}
        className="w-full h-full object-cover rounded"
        draggable={false}
      />
    </motion.div>
  );
};

export default function App () {

  const [inGame, setInGame] = useState(false); // Bool
  const [playerIndex, setPlayerIndex] = useState(-1); // Integer
  const [players, setPlayers] = useState([]); // String[] of names
  const [playerNames, setPlayerNames] = useState([]); // String[] of actual names
  const [hand, setHand] = useState([]); // String[] of cards
  const [feedback, setFeedback] = useState(''); // String
  const [showFeedback, setShowFeedback] = useState(false); // Bool
  const [turn, setTurn] = useState(-1);    // Integer
  const [pile, setPile] = useState([]);    // String[] of cards
  const [handSizes, setHandSizes] = useState([]); // Integer[] of players hands
  const [passedPlayerInfo, setPassedPlayerInfo] = useState(null); // Integer 
  const [gameOver, setGameOver] = useState({ active: false, loser: null, twoHole: false });
  


  const [showHelp, setShowHelp] = useState(false);
  const [arcValue, setArcValue] = useState(0.25); 
  const [angleSpread, setAngleSpread] = useState(12.5);
  const [sortAsc, setSortAsc] = useState(true);
  const [way, setWay] = useState(0);

  const [selectedCards, setSelectedCards] = useState([]);
  const [exitingCards, setExitingCards] = useState([]);
  const [lastThrownInfo, setLastThrownInfo] = useState({ cards: [], thrownBy: null });
  const [opponentThrownAnim, setOpponentThrownAnim] = useState(false); 
  const [jumpInPulse, setJumpInPulse] = useState("");

  // Prepare player slots, excluding the current user, and order clockwise starting from next player
  const totalPlayers = players.filter(Boolean).length;
  const otherPlayers = React.useMemo(() => {
    const arr = [];
    for (let i = 1; i < totalPlayers; i++) {
      const idx = (playerIndex + i) % totalPlayers;
      if (players[idx]) {
        arr.push({ player: players[idx], idx });
      }
    }
    return arr;
  }, [players, playerIndex, totalPlayers]);


  const [handBgColors, playerHandBg] = React.useMemo(() => {

    const handColors = generateGoldenRatioColors(totalPlayers);

    const handBgColors = handColors.map(c => ({ background: c.hex }));

    const playerHandBg = handBgColors[playerIndex] || { background: "gray" };
    return [handBgColors, playerHandBg];
  }, [totalPlayers, playerIndex]);



  const feedbackTimeoutRef = useRef(null);
  useEffect(() => {
    const handleFeedback = (message) => {
      setFeedback(message);
      setShowFeedback(true);

      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }

      feedbackTimeoutRef.current = setTimeout(() => {
        setShowFeedback(false);
        setFeedback('');
        feedbackTimeoutRef.current = null;
      }, 2000);
      };

      socket.on('feedback', handleFeedback);
      return () => {
        socket.off('feedback', handleFeedback);
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
        }
      };
  }, []);

  useEffect(() => {
    const handlePileUpdate = (newPile) => {
      setPile(newPile);

      // Jump-in check
      if (!newPile.length) return;
      const lastCard = newPile[newPile.length - 1];
      const lastValue = lastCard.slice(1);
      if (lastValue === "2") return;
      let idx = newPile.length - 1;
      while (idx > 0 && newPile[idx - 1].slice(1) === lastValue) {
        idx--;
      }
      const group = newPile.slice(idx);
    
      const pileCount = group.length;
      const handCount = hand.filter(card => card.slice(1) === lastValue).length;

      console.log("Jump-in check:", { group, handCount, pileCount, total: pileCount + handCount });


      if (pileCount + handCount === 4 && handCount > 0 && pileCount < 4) {
        setJumpInPulse(lastCard.slice(1));
        setTimeout(() => {
          setJumpInPulse("");
        }, 600);                    // ANIMATION WOOO
      }
    };
      socket.on('PileUpdate', handlePileUpdate);
      return () => socket.off('PileUpdate', handlePileUpdate);
    }, [hand]); 



  useEffect(() => {
    const handleThrownCardUpdate = ({ cards, thrownBy }) => {

      setLastThrownInfo({ cards, thrownBy });

      if (thrownBy !== playerIndex) {
        setOpponentThrownAnim(true)

        setTimeout(() => {
          setOpponentThrownAnim(false);
        }, 800);                                          //ANIMATION WOOO
      }
    };
    socket.on('ThrownCardsUpdate', handleThrownCardUpdate);
    return () => socket.off('ThrownCardsUpdate', handleThrownCardUpdate);
  }, [playerIndex, otherPlayers]);


  useEffect(() => {
    const handlePlayerHand = (newHand) => {
      const sortedNewHand = sortHand(newHand, sortAsc);

      // Calculate fanned positions for the current hand
      const fanned = FanTheCards({ hand, angleSpread, way });

      // Find cards that were removed (for exit animation)
      const removedCards = hand
        .map((card, originalIndex) => ({ card, originalIndex }))
        .filter(({ card }) => !sortedNewHand.includes(card))
        .map(({ card, originalIndex }) => ({
          cardValue: card,
          x: fanned[originalIndex][0],
          y: fanned[originalIndex][1],
          rotate: fanned[originalIndex][2],
          scale: 1.2,
          timestamp: Date.now()
        }));

      if (removedCards.length > 0) {
        setExitingCards(prev => [...prev, ...removedCards]);
        setTimeout(() => {
          setExitingCards(prev =>
            prev.filter(item => !removedCards.some(rc => rc.cardValue === item.cardValue && rc.timestamp === item.timestamp))
          );
        }, 800);                                            // ANIMATION WOOOO
      }

      setHand(sortedNewHand);
    };

    socket.on('PlayerHand', handlePlayerHand);
    return () => socket.off('PlayerHand', handlePlayerHand);
  }, [hand, sortAsc, angleSpread, arcValue, way]);


  // RMB and contextmenu handler
  useEffect(() => {
    const handleRMB = (e) => {
      if (e.button === 2 && selectedCards.length > 0) {
        e.preventDefault();

        setSelectedCards([]);
        socket.emit("throwCards", { cards: selectedCards });
      }
    };

    const preventContextMenu = (e) => e.preventDefault();

    window.addEventListener("mousedown", handleRMB);
    window.addEventListener("contextmenu", preventContextMenu);

    return () => {
      window.removeEventListener("mousedown", handleRMB);
      window.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [selectedCards]);


  
  // Clustered fucks
  useEffect(() => {
    socket.on('PlayerIndex', (Index) => setPlayerIndex(Index));
    socket.on('PlayerInfo', (Info) => setPlayers(Info));
    socket.on('PlayerNames', (names) => setPlayerNames(names));
    socket.on('TurnInfo', (Info) => setTurn(Info));
    socket.on('PlayerHandSizes', (sizes) => setHandSizes(sizes));
    socket.on('PassedPlayerInfo', (info) => setPassedPlayerInfo(info));
    socket.on('GameStarted', () => setInGame(true));
    socket.on('ForceReconnect', () => {  window.location.reload();});
  }, []);


  useEffect(() => {
      const handleGameOver = (loser, twoHole = false) => {
        setGameOver({ active: true, loser, twoHole });
      };
      socket.on('GameOver', handleGameOver);
      return () => socket.off('GameOver', handleGameOver);
    }, []);


  useEffect(() => {  //Player Index ve Playerlara dokunma
    const handleResetState = () => {
      setInGame(false)
      setGameOver({ active: false, loser: null, twoHole: false });
      setHand([]);
      setTurn(-1);
      setPile([]);
      setHandSizes([]);
      setPassedPlayerInfo(null);
      setLastThrownInfo({ cards: [], thrownBy: null });
      setSelectedCards([]);
      setFeedback('');
      setShowFeedback(false);
      setArcValue(0.25);
      setAngleSpread(12.5);
      setSortAsc(true);
      setWay(0);
      setExitingCards([]);
      setOpponentThrownAnim(false);
      setJumpInPulse(false);
      setShowHelp(false);
    };
      socket.on('ResetState', handleResetState);
      return () => socket.off('ResetState', handleResetState);
    }, []);



  const handleSelectCard = (cardValue) => {
    setSelectedCards(prev =>
        prev.includes(cardValue) ? prev.filter(c => c !== cardValue) : [...prev, cardValue]
    );
  };
  const handleRename = (newName) => {
    socket.emit('RenamePlayer', { playerIndex, newName });
  };
  const handleStartGame = () => {
    socket.emit('LaunchGame');
  };
  const handleResetServer = () => {
    socket.emit('ResetServer' , { hard: true });
  };




  return (
    <div className="relative h-screen w-screen bg-gray-400 overflow-hidden">

      <TopBar turn={turn} playerIndex={playerIndex} />
      <Sidebar 
        onReset={handleResetServer}
        onSort={() => {
          setSortAsc(s => {
            const newSortAsc = !s;
            setHand(prev => sortHand(prev, newSortAsc));
            return newSortAsc;
          });
        }}
        onWay={() => {
            setWay(w => (w + 1) % 2);
        }}
        sortAsc={sortAsc}
        way={way}
        angleSpread={angleSpread}
        setAngleSpread={setAngleSpread}
        arcValue={arcValue}
        setArcValue={setArcValue}
      />
      <Lobby 
      inGame={inGame} 
      playerIndex={playerIndex} 
      players={players} 
      playerNames={playerNames} 
      onStartGame={handleStartGame}  
      onRename={handleRename}
      />

      {/* Play Area */}
      <div className="play-area-boundary absolute" 
        style={{ top: '5rem', left: '5rem', right: '15rem',bottom: 0, }} 
      > 
        {/* Help */}
        <button
          className=" absolute top-8 left-8 w-16 h-16 rounded-full border-4 border-black bg-white text-black text-4xl font-bold flex items-center justify-center shadow-lg z-[10001] hover:bg-yellow-200 transition"
          onClick={() => setShowHelp(true)}
          aria-label="Show Help"
        >
          ?
        </button>

        {showHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-[10002]">
            <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full flex flex-col items-center relative">
              <button
                className="absolute top-4 right-12 text-8xl font-bold text-black hover:text-red-600"
                onClick={() => setShowHelp(false)}
                aria-label="Close Help"
              >
                ×
              </button>
              <h1 className="text-5xl font-bold mb-6 text-yellow-600">How to Play</h1>
              <div className="text-lg text-gray-800 text-left w-full space-y-4">
                <p>
                  <b>Goal:</b> Be the first to get rid of all your cards!
                </p>
                <ul className="list-disc ml-6">
                  <li>You must match or beat the previous cards played. You can only throw same-valued cards.</li>
                  <li>You beat the previous cards by throwing more cards or higher valued cards while matching the amount</li>
                  <li>Throwing a single card with a same value as the previous ones (regardless of the amount) passes the next player</li>
                  <li>Throwing a "2" or completing a set of four cards of the same value in the pile clears the pile and grants an extra turn </li>
                  <li>You can jump-in even if it is not your turn if you can complete a set of four cards, robbing the turn for yourself</li>
                  <li>Your last cards cannot be 2's or you will be the two-hole</li>
                </ul>
                <p>
                  <b>Controls:</b> Left Click to select Right Click to throw<br/>
                </p>
              </div>
            </div>
          </div>
        )}




        {/* Game Over */}
          {gameOver.active && (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-[9999]">
              <motion.h1 
                className="text-white text-6xl font-bold mb-8 drop-shadow-lg"
                animate={{ y: -200 }}
                transition={{ duration: 0.5, delay: 1 }}
              >
                Game Over
              </motion.h1>

              {playerIndex === 0 &&(
                <motion.button
                  className="mt-4 px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-black text-2xl font-bold rounded-2xl shadow-lg"
                  onClick={handleResetServer}
                  animate={{ y: 200 }}
                  transition={{ duration: 0.5, delay: 1 }}
                >
                  Restart
                </motion.button>
              )}

              <motion.div
                className="text-pink-800 text-8xl font-bold absolute"
                initial = {{opacity : 0}}
                  animate={{ opacity : 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
              >
                {gameOver.twoHole && (
                  <>
                    {playerNames[gameOver.loser]
                      ? `${playerNames[gameOver.loser]}`
                      : `P${gameOver.loser + 1}`
                    } is the two-hole
                  </>
                )}
                {!gameOver.twoHole && (
                  <>
                    {playerNames[gameOver.loser]
                      ? `${playerNames[gameOver.loser]}`
                      : `P${gameOver.loser + 1}`
                    } lost the game
                  </>
                )}
              </motion.div>
            </div>
          )}

          <div className="play-area w-full h-full bg-green-900 flex flex-col justify-end items-center relative">

          {/* Feedback */}
          <p
            className={`feedback-info pointer-events-none absolute left-1/2 -translate-x-1/2`}
            style={{ zIndex: 999, top: '12rem' }}
          >
            <span
              className={`feedback-info text-red-600 text-7xl select-none`}
              style={{
                opacity: showFeedback && feedback ? 1 : 0,
                transition: 'opacity 0.7s',
                pointerEvents: 'none',
                position: 'relative',
              }}
            >
              {feedback}
            </span>
          </p>

          {/* Pile Hand */}
          <div className='pile-hand bg-blue-600 w-1/6 h-1/6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-2xl shadow-2xl'>
            <PileDisplay pile={pile} lastThrownInfo={lastThrownInfo} />
          </div>


          {/* Player Hand */}
          <div
            className={`player-hand ${playerHandBg} w-5/6 h-52 flex justify-center items-center gap-4 relative shadow-2xl`}
            style={{
              opacity: passedPlayerInfo === playerIndex ? 0.5 : 1, 
                borderTopLeftRadius: '3rem',
                borderTopRightRadius: '12rem',
                borderBottomLeftRadius: '12rem',
                borderBottomRightRadius: '3rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                background: 'linear-gradient(120deg, rgba(34,197,94,0.7) 0%, rgba(59,130,246,0.7) 100%)',
                transition: 'all 0.3s cubic-bezier(.4,2,.6,1)',
            }}
          >
            {/* Player Box */}
            <motion.div
              className="player-box flex flex-col items-center justify-center w-40 h-40 text-white font-bold text-2xl shadow-lg absolute left-12 bottom-32 rounded-full"
              style={{
                background: playerHandBg.background,
              }}
              animate={
                turn === playerIndex
                  ? {
                      scale: [1, 1.15, 1],
                      boxShadow: getPlayerGlowShadow(playerHandBg.background)
                    }
                  : {
                      scale: 1,
                    }
              }
              transition={
                turn === playerIndex
                  ? { duration: 1.5, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }
                  : { duration: 0.2 }
              }
            >

            {/* Crown */}
            {inGame && hand.length === 0 && (
              <motion.img
                src="/icons/crown.png"
                className="absolute left-1/2 -translate-x-1/2 w-24 h-24 select-none pointer-events-none"
                style={{ zIndex: 200 }}
                draggable={false}
                initial={{ top: '-200px', opacity: 0 }}
                animate={{ top: '-60px', opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            )}

            <span className="text-black font-bold text-4xl select-none"> P{playerIndex + 1} </span>
            <span className="text-base font-normal select-none ">You</span>
            {inGame && (
              <span className="absolute bottom-6 right-6 bg-black bg-opacity-60 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center select-none">
                {hand.length}
              </span>
            )}
            </motion.div>

            {/* Pass Button */}
            <button
              className={`absolute right-32 bottom-16 w-24 h-24 
                ${turn !== playerIndex || !inGame 
                  ? 'bg-red-500 text-white opacity-50 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-yellow-600 text-black cursor-pointer'} 
                font-bold rounded-full text-2xl shadow-lg transition-all select-none`}
              onClick={() => socket.emit('Pass')}
              disabled={turn !== playerIndex || !inGame}
            >
              Pass
            </button>

            {/*Holding Card Logic */}
            {hand.map((cardValue, i) => {
              const fanned = FanTheCards({ hand, angleSpread, way });
              const isSelected = selectedCards.includes(cardValue);
              
              return (
                <Card
                  key={cardValue}
                  cardValue={cardValue}
                  onClick={() => handleSelectCard(cardValue)}
                  zIndexDefault={5}
                  holding={true}
                  selected={isSelected}
                  initial={{ opacity: 0, scale: 1 }}
                  jumpInPulse={jumpInPulse}
                  animate={{
                    opacity: 1,
                    x: fanned[i][0],
                    y: fanned[i][1],
                    rotate: fanned[i][2],
                    scale: 1
                  }}
                  transition={{ duration: 0.2 }}
                />
              );
            })}

            {/* Render exiting cards with exit animation */}
            {exitingCards.map((item) => {   
              return (
                <Card
                  key={item.cardValue + "-exiting"}
                  cardValue={item.cardValue}
                  zIndexDefault={100}
                  holding={true}
                  isExiting={true}
                  initial={{ 
                    opacity: 1,
                    x: item.x,
                    y: item.y,
                    rotate: item.rotate,
                    scale: item.scale,
                  }}
                />
              );
            })}
            
          </div>



          {/* Arc Table Players Representation */}
          <div className="oppenent-area absolute top-0 w-full h-32 mt-8 flex justify-evenly items-center">
            {otherPlayers.length > 0 && otherPlayers.map(({ idx }, i) => {
              const { y } = fanOpponents({ index: i, total: otherPlayers.length, arcHeight: 200 });
              const isTurn = turn === idx;
              const isPassed = passedPlayerInfo === idx;
              const isFinished = handSizes[idx] === 0;
                
              let boxClass = `
                oppenent-box  
                flex flex-col items-center justify-center w-32 h-32 shadow-lg relative rounded-2xl
                ${isTurn ? 'scale-125 rounded-full' : ''}
                ${isPassed ? 'opacity-50 scale-75' : ''}
              `;

              let boxStyle = {
                marginTop: `${y}px`,
                background: handBgColors[idx]?.background,
                position: 'relative',
                boxShadow: isTurn ? getPlayerGlowShadow(handBgColors[idx].background) : "none",
              };

              return (
                <motion.div
                  key={`row-player-${idx} flex`}
                  className={boxClass}
                  style={{
                    ...boxStyle,
                  }}
                  initial={{ marginTop: 0 }}
                  animate={
                    isTurn ? {marginTop: inGame ? y : 0, scale: [1.1, 1.25, 1.1]}: {marginTop: inGame ? y : 0, scale: 1}
                  }
                  transition={
                    isTurn
                      ? {
                          marginTop: { type: "spring", stiffness: 20, damping: 3, mass: 0.3 },
                          scale: { duration: 1.5, repeat: Infinity, repeatType: "loop", ease: "easeInOut" },
                        }
                      : {
                          marginTop: { type: "spring", stiffness: 20, damping: 3, mass: 0.3 },
                          scale: { duration: 0.2 },
                        }
                  }
                >
                {/* Crown */}
                {inGame && isFinished && (
                  <motion.img
                    src="/icons/crown.png"

                    className="absolute -top-6 -right-6 w-12 h-12 select-none pointer-events-none"
                    style={{ zIndex: 200 }}
                    draggable={false}
                    initial={{ y: -40, opacity: 0, rotate: '45deg' }}
                    animate={{ y: 0, opacity: 1, rotate: '45deg' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    />
                )}

                {/* Player Number */}
                <motion.span
                  className="absolute player-number text-black text-4xl font-bold  select-none"
                  animate={{ marginBottom: inGame ? '3rem' : '0rem' }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                >
                  P{idx + 1}
                </motion.span>
                
                {playerNames[idx] && (
                <motion.span 
                    className="absolute mt-12 text-amber-900 text-lg font-semibold select-none"
                    animate={{ marginBottom: inGame ? '2rem' : '0rem' }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                >
                  {playerNames[idx]}
                </motion.span>
                )}

                {inGame && (
                <span className="absolute bottom-2 bg-black bg-opacity-60 text-white text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center  select-none">
                  {handSizes[idx]}
                </span>
                )}

                {/* Opponent Animation */}
                {opponentThrownAnim && lastThrownInfo.thrownBy === idx &&
                  lastThrownInfo.cards.map((cardValue, idx2) => {
                    const distancePatterns = {
                      1: [0],
                      2: [-40, 40],
                      3: [-40, 0, 40],
                      4: [-30, -10, 10, 30]
                    };
                    const distances = distancePatterns[lastThrownInfo.cards.length] || [0];
                    return (
                      <Card
                        key={cardValue + "-thrown"}
                        cardValue={cardValue}
                        initial={{ opacity: 1, scale: 0.5 }}
                        animate={{
                          x: distances[idx2],
                          y: 500
                        }}

                        transition={{ duration: 0.8 , opacity: 0.2 }}
                      />
                    );
                  })
                }
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
};


function PileDisplay({ pile, lastThrownInfo }) {
  if (!pile.length) return null;

  let mainStack = [];
  let two = null;

  const lastCard = pile[pile.length - 1];
  const lastValue = lastCard.slice(1)

  if (lastValue === "2") {
    two = lastCard;

    let idx = pile.length - 2;
    let groupValue = pile[idx] ? pile[idx].slice(1) : null;
    while (idx >= 0 && pile[idx].slice(1) === groupValue) {
      idx--;
    }
    mainStack = pile.slice(idx + 1, pile.length - 1); 

  } else {
    let idx = pile.length - 1;
    while (idx > 0 && pile[idx - 1].slice(1) === lastValue) {
      idx--;
    }
    mainStack = pile.slice(idx);

  }

  const anglePatterns = {
    1: [0],
    2: [-15, 15],
    3: [-15, 0, 15],
    4: [-30, -10, 10, 30]
  };

  // Create angles array for mainStack
  let angles = anglePatterns[mainStack.length] ? [...anglePatterns[mainStack.length]] : [0];


  // If there's a 2, add it to both mainStack and angles
  if (two) {
      if (mainStack.length === 0) {
        angles[mainStack.length] = 45;
      } else if (mainStack.length === 1) {
        angles[mainStack.length] = 90;
      } else {
        angles[mainStack.length] = 0;
      }
    
    mainStack.push(two);
  }

  return (
    <>
      {mainStack.map((cardValue , idx) => {
        let animateProps, transitionProps;
        if (two && cardValue === two) {
          animateProps = {
            opacity: [0, 1],
            scale: [4, 1], 
            rotate: [angles[idx], angles[idx] + 180], 
          };
          transitionProps = {
            duration: 0.4,
            ease: "easeIn"
          };
        } else {
          animateProps = {
            opacity: lastThrownInfo.cards.includes(cardValue) ? 1 : 0.5,
            rotate: angles[idx]
          };
          transitionProps = {
            duration: 0.2,
            opacity: { delay: 1.5 },
            rotate: { delay: 0.5 }
          };
        }
        return (
          <Card
            key={cardValue + "-pile"}
            cardValue={cardValue}
            onClick={null}
            styleExtra={{
              transformOrigin: two && cardValue === two ? 'origin' : 'bottom'
            }}
            className='cursor-default'
            initial={{ opacity: 1}}
            animate={animateProps}
            transition={transitionProps}
          />
        );
      })}
    </>
  );
}
