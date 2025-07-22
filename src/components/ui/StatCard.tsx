import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

export default function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
          {icon}
          <span style={{ marginLeft: 8 }}>{title}</span>
        </Typography>
        <Typography variant="h4" component="div">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
