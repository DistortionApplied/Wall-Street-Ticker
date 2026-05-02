'use client';

import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';

export default function PhoneInterface() {
  const { game, answerCall, ignoreCall, makeCall } = useGame();
  const [selectedResponse, setSelectedResponse] = useState<string>('');

  if (!game) return null;

  const pendingCall = game.phone.pendingCalls[0];

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-3">📞 Phone</h2>

      {pendingCall ? (
        <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-500 rounded-lg animate-pulse">
          <div className="text-2xl mb-2">📞 INCOMING CALL!</div>
          <div className="text-lg font-semibold mb-2">
            From: {game.phone.contacts[pendingCall.caller].name}
          </div>
          <div className="mb-4 p-3 bg-gray-700 rounded">
            {pendingCall.message}
          </div>

          <div className="space-y-2 mb-4">
            <div className="text-sm font-semibold">Choose Response:</div>
            {Object.entries(pendingCall.responses).map(([key, response]) => (
              <button
                key={key}
                onClick={() => setSelectedResponse(key)}
                className={`w-full text-left p-2 rounded transition ${
                  selectedResponse === key
                    ? 'bg-blue-600 border-2 border-blue-400'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {response.text}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                answerCall(selectedResponse || Object.keys(pendingCall.responses)[0]);
                setSelectedResponse('');
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Answer Call
            </button>
            <button
              onClick={() => {
                ignoreCall();
                setSelectedResponse('');
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Ignore Call
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-700 rounded">
          <div className="text-gray-400 text-center">No pending calls</div>
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-lg font-semibold mb-3">Contacts (Outgoing)</h3>
        <div className="space-y-2">
          {Object.entries(game.phone.contacts)
            .filter(([, contact]) => contact.outgoing_action)
            .map(([key, contact]) => (
              <button
                key={key}
                onClick={() => makeCall(key)}
                className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded transition"
              >
                <div className="font-semibold">{contact.name}</div>
                <div className="text-sm text-gray-400">{contact.description}</div>
                {contact.cost && (
                  <div className="text-xs text-yellow-400 mt-1">Cost: ${contact.cost}</div>
                )}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
