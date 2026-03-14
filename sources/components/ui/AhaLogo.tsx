import * as React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

interface AhaLogoProps {
    size?: number;
    color?: string;
}

/**
 * Aha wordmark — geometric "A" lettermark.
 * Designed for the sidebar rail logo slot (default 20×20 in a 40×40 container).
 */
export const AhaLogo = React.memo(({ size = 20, color = '#0D1117' }: AhaLogoProps) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
            {/* Left diagonal of A */}
            <Path
                d="M 6 33 L 20 7"
                stroke={color}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Right diagonal of A */}
            <Path
                d="M 20 7 L 34 33"
                stroke={color}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Crossbar */}
            <Line
                x1="13"
                y1="23"
                x2="27"
                y2="23"
                stroke={color}
                strokeWidth="3.5"
                strokeLinecap="round"
            />
        </Svg>
    );
});
