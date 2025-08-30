import React, { useState } from "react";


function TopBar({ turn, playerIndex }) {
  return (
    <div className="top-bar fixed top-0 left-0 w-full h-20 flex items-center justify-center gap-20 z-10">
      <p className="turn-info text-4xl text-rose-800 mr-32 font-bold">
        {turn === -1
          ? "Waiting for turn info..."
          : playerIndex === turn
            ? "Your turn!"
            : `Turn = ${turn + 1}`}
      </p>
    </div>
  );
}

function Sidebar({ onReset, onSort, sortAsc, angleSpread, setAngleSpread , arcValue, setArcValue , way , onWay }) {
  return (
    <div className="side-bar fixed top-20 left-0 w-20 h-[calc(100vh-5rem)] bg-blue-900 flex flex-col items-center py-4 z-10">
      {/* Reset */}
      <button className="mb-4 text-2xl bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-2 rounded w-full" onClick={onReset}>
        Reset
      </button>
      {/* Sort */}
      <button
        className="mb-4 text-2xl bg-yellow-500 hover:bg-yellow-700 text-black font-bold py-2 px-2 rounded w-full"
        onClick={onSort}
      >
        Sort: {sortAsc ? 'Asc' : 'Dsc'}
      </button>
      {/* Slider */}
      <div className="flex bg-slate-600 flex-col items-center w-full mt-12 h-52">
        <label htmlFor="angleSpreadSlider" className="text-white text-l mb-2">Fan Angle</label>
        <input
          id="angleSpreadSlider"
          type="range"
          min="0"
          max="20"
          step="0.1"
          value={angleSpread}
          onChange={e => setAngleSpread(Number(e.target.value))}
          className="w-32"
          style={{ transform: "rotate(270deg)", marginLeft: '0px', marginTop: '60px' }}
        />
        <span className="text-red-400 text-2xl mt-2" style={{ marginLeft: '0px', marginTop: '60px' }}>{angleSpread}&deg;</span>
      </div>


       {/* Way */}
      <button
        className="mb-4 text-3xl bg-lime-500 hover:bg-yellow-700 text-black font-bold py-2 px-2 rounded w-full"
        onClick={onWay}
      >
         Way  {way}
      </button>

    </div>
  );
}

function Lobby({ inGame, playerIndex, players, playerNames, onStartGame, onRename}) {

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(players[playerIndex] || "");

  const handleEditClick = (i) => {
    if (i === playerIndex && !editing) setEditing(true);
    else setEditing(false);
  };

  const handleInputChange = (e) => setNameInput(e.target.value);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onRename) onRename(nameInput);
    setEditing(false);
  };


  return (
    <div className="lobby fixed top-20 right-0 w-60 h-1/2 bg-blue-600 flex flex-col gap-1 items-center py-4 z-10">
      <div className="w-ful text-center text-white font-bold text-2xl mb-2">
        {inGame ? "Players" : "Lobby Info"}
      </div>

      {players.filter(Boolean).length > 0
        ? players.map((player, i) =>
            player ? (
              <div key={i} className="relative w-full flex items-center">
                {/* Input box to the left if editing and this is the player */}
                {editing && i === playerIndex && (
                  <form
                    onSubmit={handleSubmit}
                    className="absolute left-[-160px] flex items-center"
                    style={{ width: "150px", height: "40px" }}
                  >
                    <input
                      className="w-full h-10 px-2 rounded border border-gray-400"
                      value={nameInput}
                      onChange={handleInputChange}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="ml-2 bg-green-500 text-white px-2 py-1 rounded"
                    >
                      ✔
                    </button>
                  </form>
                )}
                <div
                  className={`player-box text-2xl w-full h-10 flex items-center justify-center font-bold transition
                    ${i === playerIndex  ? "bg-yellow-400 text-black cursor-pointer"  : "bg-fuchsia-600 text-white cursor-default"}
                  `}
                  onClick={() => handleEditClick(i)}
                  style={{ zIndex: 1 }}
                >

                  {(playerNames && playerNames[i])
                    ? playerNames[i]
                    : player.slice(0, 3)
                  } ({i + 1})
                </div>
              </div>
            ) : null
          )
        : <div className="text-white">No players connected</div>
      }

      {!inGame && playerIndex === 0 &&(
        <button
          className="mt-auto text-2xl bg-lime-800 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
          onClick={onStartGame}
        >
          Start Game
        </button>
      )}
    </div>
  );


}

export { TopBar, Sidebar, Lobby };
