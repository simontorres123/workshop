"use client";

import { useEffect, useState } from 'react';
import { Box, BoxProps } from '@mui/material';

export const PLATFORM_LOGO = '/brand/workshop-mark.png';

type Props = Omit<BoxProps, 'component'> & { logoUrl?: string | null; alt?: string; size?: number };

export default function OrganizationLogo({ logoUrl, alt = 'Workshop', size = 40, sx, ...props }: Props) {
  const [remoteLogo, setRemoteLogo] = useState<string | null>(logoUrl || null);

  useEffect(() => {
    if (logoUrl !== undefined) {
      setRemoteLogo(logoUrl || null);
      return;
    }
    let active = true;
    fetch('/api/organization/branding')
      .then((response) => response.ok ? response.json() : null)
      .then((json) => { if (active) setRemoteLogo(json?.data?.logoUrl || null); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [logoUrl]);

  return (
    <Box
      component="img"
      src={remoteLogo || PLATFORM_LOGO}
      alt={alt}
      sx={{ width: size, height: size, objectFit: 'contain', display: 'block', ...sx }}
      {...props}
    />
  );
}
