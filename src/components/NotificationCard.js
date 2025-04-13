import React from 'react';
import { Card, Typography, Box, IconButton } from '@mui/material';
import { Close as CloseIcon, Psychology as PsychologyIcon, Warning as WarningIcon, EmojiEvents as EmojiEventsIcon } from '@mui/icons-material';

const styleIcons = {
    deep: <PsychologyIcon color="primary" />,
    harsh: <WarningIcon color="error" />,
    encouraging: <EmojiEventsIcon color="success" />
};

const styleColors = {
    deep: 'primary.main',
    harsh: 'error.main',
    encouraging: 'success.main'
};

const NotificationCard = ({
    goal,
    message,
    style = 'deep',
    onClose,
    timestamp = new Date()
}) => {
    const formattedTime = new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <Card
            sx={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                width: 350,
                zIndex: 1000,
                boxShadow: 3,
                borderLeft: `4px solid`,
                borderColor: styleColors[style],
                animation: 'slideIn 0.3s ease-out',
                '@keyframes slideIn': {
                    from: { transform: 'translateX(100%)' },
                    to: { transform: 'translateX(0)' }
                }
            }}
        >
            <Box sx={{ p: 2, position: 'relative' }}>
                <IconButton
                    size="small"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {styleIcons[style]}
                    <Typography
                        variant="subtitle2"
                        sx={{
                            ml: 1,
                            color: styleColors[style],
                            textTransform: 'capitalize'
                        }}
                    >
                        {style} Insight
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            ml: 'auto',
                            color: 'text.secondary'
                        }}
                    >
                        {formattedTime}
                    </Typography>
                </Box>

                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        color: 'text.primary'
                    }}
                >
                    {goal}
                </Typography>

                <Typography
                    variant="body2"
                    sx={{
                        color: 'text.secondary',
                        fontStyle: 'italic'
                    }}
                >
                    {message}
                </Typography>
            </Box>
        </Card>
    );
};

export default NotificationCard; 