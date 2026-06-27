package service.userservice.userservice.repository;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import service.userservice.userservice.model.Appointment;
@Repository public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByDoctorId(String doctorId);
    List<Appointment> findByPatientId(String patientId);

    /**
     * How many appointments this doctor already has on this exact date —
     * used to assign the next per-day slot number (slotNo = count + 1).
     */
    long countByDoctorIdAndDate(String doctorId, String date);
}