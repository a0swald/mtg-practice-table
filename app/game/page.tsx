import { GameClient } from '@/components/GameClient';
import { VictoryOverlay } from '@/components/VictoryOverlay';

export default function GamePage(){
  return <>
    <GameClient/>
    <VictoryOverlay/>
  </>;
}
