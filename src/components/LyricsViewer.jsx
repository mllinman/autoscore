import React from 'react';
import { useApp } from '../context/AppContext';
import { Mic, MicOff, Type } from 'lucide-react';

/**
 * LyricsViewer - Vocal-to-text annotation using Web Speech API
 * Transcribes audio vocals to text when available
 */
export default function LyricsViewer() {
  const { state } = useApp();
  const [transcript, setTranscript] = React.useState('');
  const [isListening, setIsListening] = React.useState(false);
  const [supported, setSupported] = React.useState(true);
  const recognitionRef = React.useRef(null);

  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let fullTranscript = transcript;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          fullTranscript += text + ' ';
          setTranscript(fullTranscript);
        } else {
          interim += text;
        }
      }
      if (interim) {
        setTranscript(fullTranscript + interim);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  return (
    <div style={{
      padding: 'var(--space-xl)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-lg)',
      height: '100%',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          color: 'var(--text-secondary)',
          fontSize: 'var(--text-sm)',
        }}>
          <Type size={16} />
          <strong>Lyrics / Vocal Annotation</strong>
        </div>

        {supported && (
          <button
            className={`btn btn-sm ${isListening ? 'btn-primary' : ''}`}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            {isListening ? 'Stop' : 'Start Listening'}
          </button>
        )}
      </div>

      {!supported && (
        <div style={{
          padding: 'var(--space-lg)',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-warning)',
        }}>
          Speech recognition is not supported in this browser.
          Try Chrome or Edge for vocal-to-text transcription.
        </div>
      )}

      {supported && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
        }}>
          Click "Start Listening" and play your audio to capture vocal lyrics.
          The speech recognition engine will transcribe what it hears.
        </div>
      )}

      <div style={{
        flex: 1,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-xl)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-base)',
        lineHeight: 1.8,
        color: transcript ? 'var(--text-primary)' : 'var(--text-tertiary)',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        position: 'relative',
      }}>
        {transcript || 'Transcribed lyrics will appear here...'}

        {isListening && (
          <div style={{
            position: 'absolute',
            bottom: 'var(--space-md)',
            right: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-success)',
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-success)',
              animation: 'pulse 1.5s infinite',
            }} />
            Listening...
          </div>
        )}
      </div>

      {transcript && (
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={() => {
            navigator.clipboard.writeText(transcript);
          }}>
            Copy Text
          </button>
          <button className="btn btn-sm" onClick={() => setTranscript('')}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
