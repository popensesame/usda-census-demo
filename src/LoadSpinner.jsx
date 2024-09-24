
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export default function FullPageSpinner () {
  return (
    <div
      style={{
        position: 'absolute',
        height: '100%',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, .5)'
      }} 
    >
      <Box>
        <CircularProgress />
      </Box>
    </div>
  )
}
