import { ZKLogo } from './ZKLogo';

interface ZKToastIconProps {
    className?: string;
}

export function ZKToastIcon({ className = '' }: ZKToastIconProps) {
    return (
        <div className={`flex-shrink-0 select-none ${className}`}>
            <ZKLogo size="sm" />
        </div>
    );
}
